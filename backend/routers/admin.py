from fastapi import APIRouter, Depends
from sqlmodel import Session

from auth import require_merchant
from db import get_session
from models import Merchant
from schemas import ResetResponse
from seed import reseed

router = APIRouter(tags=["admin"])


@router.post("/admin/reset", response_model=ResetResponse)
def reset(
    session: Session = Depends(get_session),
    _merchant: Merchant = Depends(require_merchant),
) -> ResetResponse:
    count = reseed(session)
    return ResetResponse(status="reset", products=count)
