import secrets
from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlmodel import Session, select

from auth import require_merchant
from db import get_session
from models import Merchant, Product, Sale, SaleLineItem, SaleSource
from schemas import (
    SaleConfirmRequest,
    SaleConfirmResponse,
    SaleDraftResponse,
    SaleHistoryItem,
    SaleHistoryLineItem,
    SaleHistoryResponse,
    SaleOut,
    StockUpdate,
)
from services.insights import evaluate_alerts
from services.match import resolve_items
from services.ocr import OcrError, extract_text
from services.parse import ParseError, parse_transcript
from services.speech import SttError, transcribe

router = APIRouter(tags=["sales"], dependencies=[Depends(require_merchant)])


def _error(status: int, code: str, message: str, detail=None) -> HTTPException:
    return HTTPException(
        status_code=status,
        detail={"error": {"code": code, "message": message, "detail": detail}},
    )


@router.post("/sales/voice", response_model=SaleDraftResponse)
async def sales_voice(
    audio: UploadFile = File(...),
    language: str | None = Form(default=None),
    merchant: Merchant = Depends(require_merchant),
    session: Session = Depends(get_session),
) -> SaleDraftResponse:
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise _error(400, "validation_error", "Empty audio upload")

    lang = language or merchant.language

    try:
        stt = transcribe(audio_bytes, lang)
    except SttError as exc:
        raise _error(400, "stt_failed", str(exc))

    transcript = stt.transcript

    try:
        parsed = parse_transcript(transcript)
    except ParseError as exc:
        raise _error(
            400,
            "parse_failed",
            str(exc),
            detail={"transcript": exc.transcript, "language_detected": stt.language_code},
        )

    products = session.exec(
        select(Product).where(Product.merchant_id == merchant.id)
    ).all()
    line_items = resolve_items(parsed.items, list(products))
    total_amount = sum(li.line_total for li in line_items)

    return SaleDraftResponse(
        draft_id=f"tmp_{secrets.token_hex(2)}",
        source=SaleSource.voice,
        transcript=transcript,
        language_detected=parsed.language_detected or stt.language_code,
        needs_clarification=parsed.needs_clarification,
        clarification=parsed.clarification,
        line_items=line_items,
        total_amount=total_amount,
    )


@router.post("/sales/confirm", response_model=SaleConfirmResponse, status_code=201)
def sales_confirm(
    body: SaleConfirmRequest,
    merchant: Merchant = Depends(require_merchant),
    session: Session = Depends(get_session),
) -> SaleConfirmResponse:
    if not body.line_items:
        raise _error(400, "validation_error", "line_items must not be empty")

    products: dict[int, Product] = {}
    for li in body.line_items:
        if li.product_id is None:
            continue
        if li.product_id in products:
            continue
        product = session.get(Product, li.product_id)
        if product is None or product.merchant_id != merchant.id:
            raise _error(404, "not_found", f"Product {li.product_id} not found")
        products[li.product_id] = product

    sale = Sale(
        merchant_id=merchant.id,
        source=body.source,
        raw_input=body.raw_input,
        total_amount=0,
        confirmed=True,
    )
    session.add(sale)
    session.flush()

    total_amount = 0
    affected_ids: list[int] = []

    for li in body.line_items:
        if li.qty <= 0:
            raise _error(400, "validation_error", "qty must be positive")
        if li.unit_price < 0:
            raise _error(400, "validation_error", "unit_price must be non-negative")

        line_total = round(li.qty * li.unit_price)
        total_amount += line_total

        product = products.get(li.product_id) if li.product_id else None
        matched_name = product.name if product else "Manual entry"
        confidence = 1.0 if product else 0.0

        session.add(
            SaleLineItem(
                sale_id=sale.id,
                product_id=li.product_id,
                matched_name=matched_name,
                qty=li.qty,
                unit=li.unit,
                unit_price=li.unit_price,
                line_total=line_total,
                match_confidence=confidence,
            )
        )

        if product is not None:
            product.current_stock = product.current_stock - li.qty
            product.last_sold_at = sale.created_at
            session.add(product)
            affected_ids.append(product.id)

    sale.total_amount = total_amount
    session.add(sale)
    session.flush()

    stock_updates = [
        StockUpdate(product_id=pid, new_stock=products[pid].current_stock)
        for pid in dict.fromkeys(affected_ids)
    ]

    alerts = evaluate_alerts(session, merchant.id, affected_ids)

    session.commit()
    session.refresh(sale)

    return SaleConfirmResponse(
        sale=SaleOut(
            id=sale.id,
            total_amount=sale.total_amount,
            confirmed=sale.confirmed,
            created_at=sale.created_at,
        ),
        stock_updates=stock_updates,
        alerts=alerts,
    )


@router.post("/sales/ocr", response_model=SaleDraftResponse)
async def sales_ocr(
    image: UploadFile = File(...),
    language: str | None = Form(default=None),
    merchant: Merchant = Depends(require_merchant),
    session: Session = Depends(get_session),
) -> SaleDraftResponse:
    image_bytes = await image.read()
    if not image_bytes:
        raise _error(400, "validation_error", "Empty image upload")

    lang = language or merchant.language
    filename = image.filename or "page.jpg"

    try:
        ocr = extract_text(image_bytes, lang, filename=filename)
    except OcrError as exc:
        raise _error(400, "ocr_failed", str(exc))

    transcript = ocr.text

    try:
        parsed = parse_transcript(transcript)
    except ParseError as exc:
        raise _error(
            400,
            "parse_failed",
            str(exc),
            detail={"transcript": exc.transcript, "language_detected": ocr.language_code},
        )

    products = session.exec(
        select(Product).where(Product.merchant_id == merchant.id)
    ).all()
    line_items = resolve_items(parsed.items, list(products))
    total_amount = sum(li.line_total for li in line_items)

    return SaleDraftResponse(
        draft_id=f"tmp_{secrets.token_hex(2)}",
        source=SaleSource.ocr,
        transcript=transcript,
        language_detected=parsed.language_detected or ocr.language_code,
        needs_clarification=parsed.needs_clarification,
        clarification=parsed.clarification,
        line_items=line_items,
        total_amount=total_amount,
    )


def _parse_iso_bound(value: str, field: str, end_of_day: bool) -> datetime:
    """Accept either a date (YYYY-MM-DD) or a full ISO-8601 datetime."""
    try:
        if "T" in value:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        else:
            d = date.fromisoformat(value)
            t = time.max if end_of_day else time.min
            dt = datetime.combine(d, t)
    except ValueError as exc:
        raise _error(400, "validation_error", f"Invalid ISO date for '{field}': {value}") from exc
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


@router.get("/sales", response_model=SaleHistoryResponse)
def list_sales(
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = Query(default=None),
    merchant: Merchant = Depends(require_merchant),
    session: Session = Depends(get_session),
) -> SaleHistoryResponse:
    stmt = (
        select(Sale)
        .where(Sale.merchant_id == merchant.id)
        .where(Sale.confirmed == True)  # noqa: E712
    )
    if from_:
        stmt = stmt.where(Sale.created_at >= _parse_iso_bound(from_, "from", end_of_day=False))
    if to:
        stmt = stmt.where(Sale.created_at <= _parse_iso_bound(to, "to", end_of_day=True))
    stmt = stmt.order_by(Sale.created_at.desc())
    sales = session.exec(stmt).all()
    if not sales:
        return SaleHistoryResponse(sales=[])

    sale_ids = [s.id for s in sales]
    line_rows = session.exec(
        select(SaleLineItem).where(SaleLineItem.sale_id.in_(sale_ids))
    ).all()
    lines_by_sale: dict[int, list[SaleLineItem]] = {}
    for li in line_rows:
        lines_by_sale.setdefault(li.sale_id, []).append(li)

    items = [
        SaleHistoryItem(
            id=s.id,
            total_amount=s.total_amount,
            source=s.source,
            created_at=s.created_at,
            line_items=[
                SaleHistoryLineItem(
                    product_id=li.product_id,
                    matched_name=li.matched_name,
                    qty=li.qty,
                    unit=li.unit,
                    unit_price=li.unit_price,
                    line_total=li.line_total,
                )
                for li in lines_by_sale.get(s.id, [])
            ],
        )
        for s in sales
    ]
    return SaleHistoryResponse(sales=items)
