"""Progress routes, mounted under /api/v1/progress."""

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.progress import service
from app.progress.schemas import ProgressRead
from app.users.deps import get_current_user
from app.users.models import User

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/me", response_model=ProgressRead)
async def get_my_progress(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ProgressRead:
    return await service.get_progress(session, user)
