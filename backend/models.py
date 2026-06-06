from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SaleSource(str, Enum):
    voice = "voice"
    ocr = "ocr"
    manual = "manual"


class Unit(str, Enum):
    piece = "piece"
    kg = "kg"
    gram = "gram"
    litre = "litre"
    ml = "ml"
    packet = "packet"
    dozen = "dozen"


class AlertType(str, Enum):
    reorder = "reorder"
    stockout = "stockout"
    dead_stock = "dead_stock"
    wastage_risk = "wastage_risk"
    margin_leader = "margin_leader"
    pairing = "pairing"


class Severity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class BusinessType(str, Enum):
    kirana = "kirana"
    chemist = "chemist"
    salon = "salon"
    distributor = "distributor"
    other = "other"


class Merchant(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    phone: str
    language: str
    business_type: BusinessType
    created_at: datetime = Field(default_factory=utcnow)


class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    merchant_id: int = Field(foreign_key="merchant.id", index=True)
    name: str = Field(index=True)
    aliases: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    category: str
    unit: Unit
    cost_price: int
    selling_price: int
    current_stock: float
    reorder_point: float
    is_perishable: bool = False
    last_sold_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow)


class Sale(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    merchant_id: int = Field(foreign_key="merchant.id", index=True)
    source: SaleSource
    raw_input: Optional[str] = None
    total_amount: int
    confirmed: bool = False
    created_at: datetime = Field(default_factory=utcnow)


class SaleLineItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sale_id: int = Field(foreign_key="sale.id", index=True)
    product_id: Optional[int] = Field(default=None, foreign_key="product.id")
    matched_name: str
    qty: float
    unit: Unit
    unit_price: int
    line_total: int
    match_confidence: float


class Alert(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    merchant_id: int = Field(foreign_key="merchant.id", index=True)
    type: AlertType
    severity: Severity
    product_id: Optional[int] = Field(default=None, foreign_key="product.id")
    message: str
    created_at: datetime = Field(default_factory=utcnow)
    dismissed: bool = False
