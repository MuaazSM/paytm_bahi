from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_serializer

from models import AlertType, BusinessType, SaleSource, Severity, Unit


def _iso_utc(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat(timespec="seconds").replace("+00:00", "Z")


# --- Error envelope ---------------------------------------------------------


class ErrorBody(BaseModel):
    code: str
    message: str
    detail: Optional[Any] = None


class ErrorEnvelope(BaseModel):
    error: ErrorBody


# --- Health -----------------------------------------------------------------


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


# --- Merchant / auth --------------------------------------------------------


class MerchantOut(BaseModel):
    id: int
    name: str
    language: str
    business_type: BusinessType


class LoginRequest(BaseModel):
    phone: str


class LoginResponse(BaseModel):
    token: str
    merchant: MerchantOut


# --- Products ---------------------------------------------------------------


class ProductOut(BaseModel):
    @field_serializer("last_sold_at")
    def _ser_last_sold_at(self, v: Optional[datetime]) -> Optional[str]:
        return _iso_utc(v)

    id: int
    name: str
    category: str
    unit: Unit
    cost_price: int
    selling_price: int
    current_stock: float
    reorder_point: float
    is_perishable: bool
    last_sold_at: Optional[datetime] = None


class ProductListResponse(BaseModel):
    products: list[ProductOut]


class ProductCreate(BaseModel):
    name: str
    aliases: list[str] = Field(default_factory=list)
    category: str
    unit: Unit
    cost_price: int
    selling_price: int
    current_stock: float
    reorder_point: float
    is_perishable: bool = False


class ProductPatch(BaseModel):
    name: Optional[str] = None
    aliases: Optional[list[str]] = None
    category: Optional[str] = None
    unit: Optional[Unit] = None
    cost_price: Optional[int] = None
    selling_price: Optional[int] = None
    current_stock: Optional[float] = None
    reorder_point: Optional[float] = None
    is_perishable: Optional[bool] = None


# --- Admin ------------------------------------------------------------------


class ResetResponse(BaseModel):
    status: Literal["reset"] = "reset"
    products: int


# --- Sales (skeletons; expanded in later commits) ---------------------------


class SaleDraftLineItem(BaseModel):
    product_id: Optional[int]
    matched_name: str
    qty: float
    unit: Unit
    unit_price: int
    line_total: int
    match_confidence: float


class SaleDraftResponse(BaseModel):
    draft_id: str
    source: SaleSource
    transcript: str
    language_detected: Optional[str] = None
    needs_clarification: bool = False
    clarification: Optional[str] = None
    line_items: list[SaleDraftLineItem]
    total_amount: int


class ConfirmLineItem(BaseModel):
    product_id: Optional[int]
    qty: float
    unit: Unit
    unit_price: int


class SaleConfirmRequest(BaseModel):
    source: SaleSource
    raw_input: Optional[str] = None
    line_items: list[ConfirmLineItem]


class SaleOut(BaseModel):
    id: int
    total_amount: int
    confirmed: bool
    created_at: datetime

    @field_serializer("created_at")
    def _ser_created_at(self, v: datetime) -> str:
        return _iso_utc(v)  # type: ignore[return-value]


class StockUpdate(BaseModel):
    product_id: int
    new_stock: float


class AlertOut(BaseModel):
    id: int
    type: AlertType
    severity: Severity
    product_id: Optional[int]
    message: str
    spoken_message: Optional[str] = None
    created_at: Optional[datetime] = None
    dismissed: Optional[bool] = None

    @field_serializer("created_at")
    def _ser_created_at(self, v: Optional[datetime]) -> Optional[str]:
        return _iso_utc(v)


class SaleConfirmResponse(BaseModel):
    sale: SaleOut
    stock_updates: list[StockUpdate]
    alerts: list[AlertOut]


# --- ParsedSale (LLM contract, DATA_CONTRACTS.md §3.1) ----------------------


class ParsedItem(BaseModel):
    name: str
    qty: float = 1.0
    unit: Unit = Unit.piece
    unit_price: Optional[int] = None
    price_is_total: bool = False


class ParsedSale(BaseModel):
    items: list[ParsedItem]
    language_detected: Optional[str] = None
    needs_clarification: bool = False
    clarification: Optional[str] = None


# --- Sales history ----------------------------------------------------------


class SaleHistoryLineItem(BaseModel):
    product_id: Optional[int]
    matched_name: str
    qty: float
    unit: Unit
    unit_price: int
    line_total: int


class SaleHistoryItem(BaseModel):
    id: int
    total_amount: int
    source: SaleSource
    created_at: datetime
    line_items: list[SaleHistoryLineItem]

    @field_serializer("created_at")
    def _ser_created_at(self, v: datetime) -> str:
        return _iso_utc(v)  # type: ignore[return-value]


class SaleHistoryResponse(BaseModel):
    sales: list[SaleHistoryItem]


# --- Insights ---------------------------------------------------------------


class TopMover(BaseModel):
    product_id: int
    name: str
    units: float
    revenue_paise: int


class DeadStockItem(BaseModel):
    product_id: int
    name: str
    days_since_sale: int
    stock: float


class RunningLowItem(BaseModel):
    product_id: int
    name: str
    stock: float
    reorder_point: float


class WastageRiskItem(BaseModel):
    product_id: int
    name: str
    stock: float
    trend: str


class MarginLeader(BaseModel):
    product_id: int
    name: str
    margin_paise: int
    units: float


class Pairing(BaseModel):
    a: str
    b: str
    count: int


class InsightsSummaryResponse(BaseModel):
    revenue_today_paise: int
    revenue_week_paise: int
    top_movers: list[TopMover]
    dead_stock: list[DeadStockItem]
    running_low: list[RunningLowItem]
    wastage_risk: list[WastageRiskItem]
    margin_leaders: list[MarginLeader]
    pairings: list[Pairing]


# --- Alerts -----------------------------------------------------------------


class AlertsListResponse(BaseModel):
    alerts: list[AlertOut]


class AlertDismissResponse(BaseModel):
    id: int
    dismissed: bool


# --- Assistant --------------------------------------------------------------


class AssistantQueryTextRequest(BaseModel):
    text: str
    language: Optional[str] = None


class AssistantQueryResponse(BaseModel):
    question_text: str
    answer_text: str
    answer_audio_url: Optional[str] = None
    data: Optional[dict[str, Any]] = None


class SpeakRequest(BaseModel):
    text: str
    language: Optional[str] = None


class SpeakResponse(BaseModel):
    audio_url: str
