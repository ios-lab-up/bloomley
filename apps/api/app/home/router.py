"""Screen-level aggregates, mounted under /api/v1:
    GET  /api/v1/home/today
    POST /api/v1/onboarding
"""

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.home import service
from app.home.schemas import HomeToday, OnboardingRead, OnboardingRequest
from app.users.deps import get_current_user
from app.users.models import User

home_router = APIRouter(prefix="/home", tags=["home"])
onboarding_router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@home_router.get("/today", response_model=HomeToday)
async def get_home_today(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> HomeToday:
    return await service.home_today(session, user)


@onboarding_router.post("", response_model=OnboardingRead)
async def apply_onboarding(
    payload: OnboardingRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> OnboardingRead:
    """Call once right after sign-up with the pillars / intention / energy chosen
    before the account existed. Replaces N calls to /wellness-areas/{id}/select."""
    return await service.apply_onboarding(session, user, payload)
