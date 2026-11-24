"""Push delivery through the Expo push service.

https://docs.expo.dev/push-notifications/sending-notifications/ -- a POST with
up to 100 messages; the response has one "ticket" per message, in order. A
ticket with `details.error == "DeviceNotRegistered"` means the token is dead
(app uninstalled), so we deactivate it instead of retrying forever.
"""

import logging
from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta

import httpx
from sqlalchemy import update
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings
from app.notifications.models import Notification
from app.users.models import NotificationSettings, PushToken

logger = logging.getLogger(__name__)

BATCH_SIZE = 100
# A notification that still can't be delivered after this long is dropped from
# the push queue (it stays in the inbox): a stale "tu racha te espera" is noise.
GIVE_UP_AFTER = timedelta(hours=1)

Sender = Callable[[list[dict], Settings], Awaitable[list[dict]]]


async def send_expo(messages: list[dict], settings: Settings) -> list[dict]:
    """One request, one ticket per message (raises on transport/HTTP errors)."""
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            settings.expo_push_url,
            json=messages,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
        )
    response.raise_for_status()
    return response.json()["data"]


async def dispatch_pending(
    session: AsyncSession, settings: Settings, sender: Sender = send_expo
) -> int:
    """Sends up to BATCH_SIZE pending notifications. Rows are claimed with
    SKIP LOCKED, so replicas running this at once never double-send. Returns
    how many were marked sent."""
    pending = (
        await session.exec(
            select(Notification)
            .where(Notification.push_status == "pending")
            .order_by(Notification.created_at)
            .limit(BATCH_SIZE)
            .with_for_update(skip_locked=True)
        )
    ).all()
    if not pending:
        return 0

    user_ids = {n.user_id for n in pending}
    opted_out = {
        s.user_id
        for s in (
            await session.exec(
                select(NotificationSettings).where(
                    NotificationSettings.user_id.in_(user_ids),
                    NotificationSettings.enabled.is_(False),
                )
            )
        ).all()
    }
    tokens: dict = {}
    for token in (
        await session.exec(
            select(PushToken).where(PushToken.user_id.in_(user_ids), PushToken.is_active.is_(True))
        )
    ).all():
        tokens.setdefault(token.user_id, []).append(token.expo_push_token)

    outgoing: list[tuple[Notification, dict]] = []
    for n in pending:
        targets = [] if n.user_id in opted_out else tokens.get(n.user_id, [])
        if not targets:
            n.push_status = "skipped"  # opted out, or no device to send to
            continue
        for target in targets:
            outgoing.append(
                (
                    n,
                    {
                        "to": target,
                        "title": n.title,
                        "body": n.body,
                        "sound": "default",
                        "data": {**n.data, "notification_id": str(n.id), "type": n.type},
                    },
                )
            )

    sent: set = set()
    dead: set[str] = set()
    failed_transport = False
    for i in range(0, len(outgoing), BATCH_SIZE):
        chunk = outgoing[i : i + BATCH_SIZE]
        try:
            tickets = await sender([m for _, m in chunk], settings)
        except (httpx.HTTPError, KeyError, ValueError):
            logger.exception("Expo push request failed; will retry")
            failed_transport = True
            continue
        for (n, message), ticket in zip(chunk, tickets):
            if ticket.get("status") == "ok":
                sent.add(n.id)
            elif (ticket.get("details") or {}).get("error") == "DeviceNotRegistered":
                dead.add(message["to"])

    if dead:
        await session.exec(
            update(PushToken).where(PushToken.expo_push_token.in_(dead)).values(is_active=False)
        )
    now = datetime.utcnow()
    for n in pending:
        if n.push_status != "pending":
            continue
        if n.id in sent:
            n.push_status = "sent"
        elif failed_transport and now - n.created_at < GIVE_UP_AFTER:
            continue  # transient: try again next tick
        else:
            n.push_status = "failed"
        session.add(n)
    await session.commit()
    return len(sent)
