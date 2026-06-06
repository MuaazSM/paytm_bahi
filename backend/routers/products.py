from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, col, select

from auth import require_merchant
from db import get_session
from models import Merchant, Product
from schemas import ProductCreate, ProductListResponse, ProductOut, ProductPatch

router = APIRouter(tags=["products"])


def _to_out(p: Product) -> ProductOut:
    return ProductOut(
        id=p.id,
        name=p.name,
        category=p.category,
        unit=p.unit,
        cost_price=p.cost_price,
        selling_price=p.selling_price,
        current_stock=p.current_stock,
        reorder_point=p.reorder_point,
        is_perishable=p.is_perishable,
        last_sold_at=p.last_sold_at,
    )


def _not_found(message: str = "Product not found") -> HTTPException:
    return HTTPException(
        status_code=404,
        detail={"error": {"code": "not_found", "message": message, "detail": None}},
    )


@router.get("/products", response_model=ProductListResponse)
def list_products(
    q: Optional[str] = Query(default=None),
    low_only: bool = Query(default=False),
    session: Session = Depends(get_session),
    merchant: Merchant = Depends(require_merchant),
) -> ProductListResponse:
    stmt = select(Product).where(Product.merchant_id == merchant.id)
    if low_only:
        stmt = stmt.where(Product.current_stock <= Product.reorder_point)
    stmt = stmt.order_by(Product.name)
    rows = session.exec(stmt).all()

    if q:
        needle = q.lower().strip()
        rows = [
            p for p in rows
            if needle in p.name.lower()
            or any(needle in a.lower() for a in (p.aliases or []))
        ]

    return ProductListResponse(products=[_to_out(p) for p in rows])


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(
    body: ProductCreate,
    session: Session = Depends(get_session),
    merchant: Merchant = Depends(require_merchant),
) -> ProductOut:
    product = Product(merchant_id=merchant.id, **body.model_dump())
    session.add(product)
    session.commit()
    session.refresh(product)
    return _to_out(product)


@router.patch("/products/{product_id}", response_model=ProductOut)
def patch_product(
    product_id: int,
    body: ProductPatch,
    session: Session = Depends(get_session),
    merchant: Merchant = Depends(require_merchant),
) -> ProductOut:
    product = session.get(Product, product_id)
    if product is None or product.merchant_id != merchant.id:
        raise _not_found()
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(product, field, value)
    session.add(product)
    session.commit()
    session.refresh(product)
    return _to_out(product)
