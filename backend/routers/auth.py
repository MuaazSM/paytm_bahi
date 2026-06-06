from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from auth import STATIC_DEMO_TOKEN, require_merchant
from db import get_session
from models import Merchant
from schemas import LoginRequest, LoginResponse, MerchantOut

router = APIRouter(tags=["auth"])


@router.post("/auth/login", response_model=LoginResponse)
def login(_req: LoginRequest, session: Session = Depends(get_session)) -> LoginResponse:
    merchant = session.exec(select(Merchant).order_by(Merchant.id)).first()
    if merchant is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "No merchant seeded", "detail": None}},
        )
    return LoginResponse(
        token=STATIC_DEMO_TOKEN,
        merchant=MerchantOut(
            id=merchant.id,
            name=merchant.name,
            language=merchant.language,
            business_type=merchant.business_type,
        ),
    )


@router.get("/merchant/me", response_model=MerchantOut)
def merchant_me(merchant: Merchant = Depends(require_merchant)) -> MerchantOut:
    return MerchantOut(
        id=merchant.id,
        name=merchant.name,
        language=merchant.language,
        business_type=merchant.business_type,
    )
