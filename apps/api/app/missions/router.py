"""Routes owned by the Missions domain (Módulo 2).

Mounted in app.main under /api/v1 (see app/main.py):
    /api/v1/missions...
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.missions import service
from app.missions.models import MissionCompletion
from app.missions.schemas import (
    BloomFeedbackRead,
    MissionCompletionRead,
    MissionCompleteRequest,
    MissionRead,
)
from app.users.deps import get_current_user
from app.users.models import User

router = APIRouter(prefix="/missions", tags=["missions"])


@router.get("", response_model=list[MissionRead])
async def list_available_missions(
    area_id: UUID | None = None,
    mine: bool = False,
    _user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[MissionRead]:
    if area_id is not None and mine:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Use either area_id or mine, not both"
        )
    return await service.list_missions(session, _user.id, area_id, mine)


@router.get("/{mission_id}", response_model=MissionRead)
async def get_mission(
    mission_id: UUID,
    _user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MissionRead:
    mission = await service.get_mission(session, mission_id)
    if mission is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mission not found")
    return mission


@router.post("/{mission_id}/complete", response_model=MissionCompletionRead)
async def complete_mission(
    mission_id: UUID,
    payload: MissionCompleteRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MissionCompletionRead:
    result = await service.complete_mission(
        session, user, mission_id, payload.engaged_minutes, payload.group_id
    )
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mission not found")
    completion, _feedback, mission = result
    return _completion_read(completion, mission)


@router.get("/me/completions", response_model=list[MissionCompletionRead])
async def list_my_completions(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[MissionCompletionRead]:
    rows = await service.list_user_completions(session, user.id, limit, offset)
    return [
        _completion_read(completion, mission)
        for completion, mission in rows
    ]


@router.get("/me/feedback", response_model=list[BloomFeedbackRead])
async def list_my_feedback(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[BloomFeedbackRead]:
    return await service.list_user_feedback(session, user.id, limit, offset)


def _completion_read(completion: MissionCompletion, mission) -> MissionCompletionRead:
    return MissionCompletionRead(
        id=completion.id,
        mission_id=completion.mission_id,
        group_id=completion.group_id,
        engaged_minutes=completion.engaged_minutes,
        xp_earned=completion.xp_earned,
        criteria_met=completion.criteria_met,
        completed_at=completion.completed_at,
        mission=MissionRead.model_validate(mission),
    )