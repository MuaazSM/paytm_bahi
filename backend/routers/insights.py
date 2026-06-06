from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from auth import require_merchant
from db import get_session
from models import Alert, Merchant, Product
from schemas import (
    AlertDismissResponse,
    AlertOut,
    AlertsListResponse,
    InsightsSummaryResponse,
)
from services.insights import compute_summary, spoken_message_for

router = APIRouter(tags=["insights"])


def _not_found(message: str = "Alert not found") -> HTTPException:
    return HTTPException(
        status_code=404,
        detail={"error": {"code": "not_found", "message": message, "detail": None}},
    )


@router.get("/insights/summary", response_model=InsightsSummaryResponse)
def insights_summary(
    session: Session = Depends(get_session),
    merchant: Merchant = Depends(require_merchant),
) -> InsightsSummaryResponse:
    return compute_summary(session, merchant.id)


@router.get("/insights/alerts", response_model=AlertsListResponse)
def list_alerts(
    include_dismissed: bool = Query(default=False),
    session: Session = Depends(get_session),
    merchant: Merchant = Depends(require_merchant),
) -> AlertsListResponse:
    stmt = select(Alert).where(Alert.merchant_id == merchant.id)
    if not include_dismissed:
        stmt = stmt.where(Alert.dismissed == False)  # noqa: E712
    stmt = stmt.order_by(Alert.created_at.desc())
    alerts = session.exec(stmt).all()

    out: list[AlertOut] = []
    for a in alerts:
        product = session.get(Product, a.product_id) if a.product_id else None
        spoken = spoken_message_for(product, a.type) if product else None
        out.append(
            AlertOut(
                id=a.id,
                type=a.type,
                severity=a.severity,
                product_id=a.product_id,
                message=a.message,
                spoken_message=spoken,
                created_at=a.created_at,
                dismissed=a.dismissed,
            )
        )
    return AlertsListResponse(alerts=out)


@router.post("/insights/alerts/{alert_id}/dismiss", response_model=AlertDismissResponse)
def dismiss_alert(
    alert_id: int,
    session: Session = Depends(get_session),
    merchant: Merchant = Depends(require_merchant),
) -> AlertDismissResponse:
    alert = session.get(Alert, alert_id)
    if alert is None or alert.merchant_id != merchant.id:
        raise _not_found()
    alert.dismissed = True
    session.add(alert)
    session.commit()
    return AlertDismissResponse(id=alert.id, dismissed=True)
