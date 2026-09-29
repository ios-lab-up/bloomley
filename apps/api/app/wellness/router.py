"""Routes owned by the Wellness domain (Módulo 2).

Mounted in app.main under /api/v1 (see app/main.py):
    /api/v1/wellness-areas...
    /api/v1/checkins...
    /api/v1/streaks...
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.users.deps import get_current_user
from app.users.models import User
from app.wellness import service
from app.wellness.schemas import (
    CheckinCreate,
    CheckinRead,
    StreakRead,
    WellnessAreaRead,
)

areas_router = APIRouter(prefix="/wellness-areas", tags=["wellness"])
checkins_router = APIRouter(prefix="/checkins", tags=["wellness"])
streaks_router = APIRouter(prefix="/streaks", tags=["wellness"])


@areas_router.get("", response_model=list[WellnessAreaRead])
async def list_areas(
    session: AsyncSession = Depends(get_session),
    _user: User = Depends(get_current_user),
) -> list[WellnessAreaRead]:
    return await service.list_wellness_areas(session)


# Registered before /{wellness_area_id} so "me" is not matched as a uuid.
@areas_router.get("/me", response_model=list[WellnessAreaRead])
async def list_my_areas(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[WellnessAreaRead]:
    return await service.list_user_wellness_areas(session, user.id)


@areas_router.get("/{wellness_area_id}", response_model=WellnessAreaRead)
async def get_area(
    wellness_area_id: UUID,
    session: AsyncSession = Depends(get_session),
    _user: User = Depends(get_current_user),
) -> WellnessAreaRead:
    area = await service.get_wellness_area(session, wellness_area_id)
    if area is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Wellness area not found")
    return area


@areas_router.post(
    "/{wellness_area_id}/select",
    response_model=WellnessAreaRead,
    status_code=status.HTTP_201_CREATED,
)
async def select_area(
    wellness_area_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> WellnessAreaRead:
    area = await service.get_wellness_area(session, wellness_area_id)
    if area is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Wellness area not found")
    await service.add_area_to_user(session, user.id, wellness_area_id)
    return area


@areas_router.delete("/{wellness_area_id}/select", status_code=status.HTTP_204_NO_CONTENT)
async def deselect_area(
    wellness_area_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    area = await service.get_wellness_area(session, wellness_area_id)
    if area is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Wellness area not found")
    await service.remove_area_from_user(session, user.id, wellness_area_id)


@checkins_router.post("", response_model=CheckinRead, status_code=status.HTTP_201_CREATED)
async def create_checkin(
    payload: CheckinCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> CheckinRead:
    return await service.create_checkin(
        session, user.id, payload.energy_level, payload.intention
    )


@checkins_router.get("/me", response_model=list[CheckinRead])
async def list_my_checkins(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[CheckinRead]:
    return await service.list_user_checkins(session, user.id, limit, offset)


@streaks_router.get("/me", response_model=StreakRead)
async def get_my_streak(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> StreakRead:
    return await service.get_or_create_streak(session, user.id)