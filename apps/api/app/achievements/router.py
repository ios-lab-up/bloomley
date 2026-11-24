"""Achievements routes, mounted under /api/v1/achievements."""

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.achievements import service
from app.achievements.schemas import AchievementRead
from app.core.database import get_session
from app.users.deps import get_current_user
from app.users.models import User

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("/me", response_model=list[AchievementRead])
async def list_my_achievements(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[AchievementRead]:
    """The whole catalogue with the user's state and progress: unlocked ones
    first-class, locked ones with how far along they are."""
    rows = await service.list_for_user(session, user.id)
    return [
        AchievementRead(
            key=a.key,
            title=a.title,
            description=a.description,
            rule_type=a.rule_type,
            threshold=a.threshold,
            progress=progress,
            unlocked=ua is not None,
            unlocked_at=ua.unlocked_at if ua else None,
        )
        for a, ua, progress in rows
    ]
