from typing import Optional

from fastapi import Depends, Header, HTTPException
from sqlmodel import Session, select

from db import get_session
from models import Merchant

STATIC_DEMO_TOKEN = "demo-static-token"


def _unauthorized(message: str = "Missing or invalid bearer token") -> HTTPException:
    return HTTPException(
        status_code=401,
        detail={"error": {"code": "unauthorized", "message": message, "detail": None}},
    )


def require_merchant(
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
) -> Merchant:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise _unauthorized()
    token = authorization.split(" ", 1)[1].strip()
    if token != STATIC_DEMO_TOKEN:
        raise _unauthorized()
    merchant = session.exec(select(Merchant).order_by(Merchant.id)).first()
    if merchant is None:
        raise _unauthorized("Merchant not seeded")
    return merchant
