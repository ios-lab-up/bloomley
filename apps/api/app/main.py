"""FastAPI application entrypoint.

Follows Screaming Architecture: business-domain modules live as siblings of
`core/` under `app/` (e.g. `app/users/`, `app/habits/`), each owning its own
models, routes, and services.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.groups.router import router as groups_router
from app.users.router import router as users_router
from app.users.router import webhook_router as webhooks_router

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router, prefix="/api/v1")
app.include_router(webhooks_router, prefix="/api/v1")
app.include_router(groups_router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
