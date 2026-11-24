"""FastAPI application entrypoint.

Follows Screaming Architecture: business-domain modules live as siblings of
`core/` under `app/` (e.g. `app/users/`, `app/habits/`), each owning its own
models, routes, and services.
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.achievements.router import router as achievements_router
from app.core.config import get_settings
from app.groups.router import router as groups_router
from app.home.router import home_router, onboarding_router
from app.missions.router import router as missions_router
from app.notifications import worker as notifications_worker
from app.notifications.router import router as notifications_router
from app.progress.router import router as progress_router
from app.users.router import router as users_router
from app.users.router import webhook_router as webhooks_router
from app.wellness.router import areas_router, checkins_router, streaks_router

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    task = None
    if settings.notifications_worker_enabled:
        task = asyncio.create_task(notifications_worker.run_forever(settings))
    try:
        yield
    finally:
        if task is not None:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    # Auth travels in the Authorization header, never in cookies, so the
    # browser "credentials" mode isn't needed (and "*" + credentials is a
    # combination browsers reject anyway).
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router, prefix="/api/v1")
app.include_router(webhooks_router, prefix="/api/v1")
app.include_router(groups_router, prefix="/api/v1")
app.include_router(areas_router, prefix="/api/v1")
app.include_router(checkins_router, prefix="/api/v1")
app.include_router(streaks_router, prefix="/api/v1")
app.include_router(missions_router, prefix="/api/v1")
app.include_router(home_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(achievements_router, prefix="/api/v1")
app.include_router(progress_router, prefix="/api/v1")
app.include_router(onboarding_router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}