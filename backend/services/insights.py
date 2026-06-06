from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from models import Alert, AlertType, Product, Sale, SaleLineItem, Severity, Unit
from schemas import (
    AlertOut,
    DeadStockItem,
    InsightsSummaryResponse,
    MarginLeader,
    Pairing,
    RunningLowItem,
    TopMover,
    WastageRiskItem,
)

# --- Tunable thresholds (PRD §10.3) -----------------------------------------

WINDOW_DAYS = 14                # rolling window for velocity / margin / pairings
DEAD_STOCK_DAYS = 14            # no sale in this many days → dead stock
TOP_MOVERS_LIMIT = 5
MARGIN_LEADERS_LIMIT = 5
DEAD_STOCK_LIMIT = 5
WASTAGE_RISK_LIMIT = 5
PAIRINGS_LIMIT = 5
PAIRING_MIN_COUNT = 2           # ignore one-off co-occurrences


_HINDI_UNIT = {
    Unit.piece: "",
    Unit.kg: "kilo",
    Unit.gram: "gram",
    Unit.litre: "litre",
    Unit.ml: "ml",
    Unit.packet: "packet",
    Unit.dozen: "dozen",
}


def _messages(product: Product, alert_type: AlertType) -> tuple[str, str]:
    """Return (english/display message, Hindi spoken_message) for an alert."""
    stock = int(product.current_stock) if product.current_stock == int(product.current_stock) else product.current_stock
    name = product.name
    unit_en = product.unit.value
    unit_hi = _HINDI_UNIT.get(product.unit, "")
    hi_qty = f"{stock} {unit_hi}".strip()
    if alert_type == AlertType.stockout:
        message = f"{name} is out of stock — reorder now."
        spoken = f"{name} khatam ho gaya hai, turant order karein."
    else:  # reorder
        message = f"{name} is down to {stock} {unit_en} — reorder soon?"
        spoken = f"{name} sirf {hi_qty} bacha hai, dobara order karein?"
    return message, spoken


def spoken_message_for(product: Product, alert_type: AlertType) -> str:
    """Public helper: regenerate the Hindi spoken_message for an existing alert."""
    return _messages(product, alert_type)[1]


def _start_of_day_utc(dt: datetime) -> datetime:
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def _as_utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def compute_summary(session: Session, merchant_id: int) -> InsightsSummaryResponse:
    """Compute the full insight object from CONFIRMED sales over the rolling window."""
    now = datetime.now(timezone.utc)
    today_start = _start_of_day_utc(now)
    week_start = today_start - timedelta(days=7)
    window_start = today_start - timedelta(days=WINDOW_DAYS)
    half_window = window_start + timedelta(days=WINDOW_DAYS / 2)

    products: list[Product] = list(
        session.exec(select(Product).where(Product.merchant_id == merchant_id)).all()
    )
    product_by_id: dict[int, Product] = {p.id: p for p in products if p.id is not None}

    # All confirmed sales in window with their line items.
    rows = session.exec(
        select(Sale, SaleLineItem)
        .join(SaleLineItem, SaleLineItem.sale_id == Sale.id)
        .where(Sale.merchant_id == merchant_id)
        .where(Sale.confirmed == True)  # noqa: E712
        .where(Sale.created_at >= window_start)
    ).all()

    # --- Revenue today / this week --------------------------------------
    revenue_today = 0
    revenue_week = 0
    seen_sales_today: set[int] = set()
    seen_sales_week: set[int] = set()
    for sale, _li in rows:
        sale_dt = _as_utc(sale.created_at)
        if sale_dt >= today_start and sale.id not in seen_sales_today:
            revenue_today += sale.total_amount
            seen_sales_today.add(sale.id)
        if sale_dt >= week_start and sale.id not in seen_sales_week:
            revenue_week += sale.total_amount
            seen_sales_week.add(sale.id)

    # --- Per-product aggregates over the window -------------------------
    units_by_pid: dict[int, float] = defaultdict(float)
    revenue_by_pid: dict[int, int] = defaultdict(int)
    margin_by_pid: dict[int, int] = defaultdict(int)
    units_first_half: dict[int, float] = defaultdict(float)
    units_second_half: dict[int, float] = defaultdict(float)
    # sale_id → set of product_ids (for pairings)
    products_per_sale: dict[int, set[int]] = defaultdict(set)

    for sale, li in rows:
        pid = li.product_id
        if pid is None:
            continue
        sale_dt = _as_utc(sale.created_at)
        units_by_pid[pid] += li.qty
        revenue_by_pid[pid] += li.line_total
        product = product_by_id.get(pid)
        if product is not None:
            margin_by_pid[pid] += round((product.selling_price - product.cost_price) * li.qty)
        if sale_dt < half_window:
            units_first_half[pid] += li.qty
        else:
            units_second_half[pid] += li.qty
        products_per_sale[sale.id].add(pid)

    # --- top_movers: velocity = units / WINDOW_DAYS ---------------------
    top_movers = [
        TopMover(
            product_id=pid,
            name=product_by_id[pid].name,
            units=units_by_pid[pid],
            revenue_paise=revenue_by_pid[pid],
        )
        for pid in units_by_pid
        if pid in product_by_id
    ]
    top_movers.sort(key=lambda m: m.units, reverse=True)
    top_movers = top_movers[:TOP_MOVERS_LIMIT]

    # --- dead_stock: no sale in DEAD_STOCK_DAYS, stock > 0 --------------
    dead_cutoff = now - timedelta(days=DEAD_STOCK_DAYS)
    dead_stock: list[DeadStockItem] = []
    for p in products:
        if p.id is None or p.current_stock <= 0:
            continue
        last = _as_utc(p.last_sold_at) if p.last_sold_at else None
        if last is None:
            days_since = DEAD_STOCK_DAYS + 1
        elif last < dead_cutoff:
            days_since = (now - last).days
        else:
            continue
        dead_stock.append(
            DeadStockItem(
                product_id=p.id, name=p.name, days_since_sale=days_since, stock=p.current_stock
            )
        )
    dead_stock.sort(key=lambda d: d.days_since_sale, reverse=True)
    dead_stock = dead_stock[:DEAD_STOCK_LIMIT]

    # --- running_low: stock <= reorder_point ----------------------------
    running_low = [
        RunningLowItem(
            product_id=p.id,  # type: ignore[arg-type]
            name=p.name,
            stock=p.current_stock,
            reorder_point=p.reorder_point,
        )
        for p in products
        if p.id is not None and p.current_stock <= p.reorder_point
    ]
    running_low.sort(key=lambda r: r.stock)

    # --- wastage_risk: perishable AND declining sell-through ------------
    wastage_risk: list[WastageRiskItem] = []
    for p in products:
        if p.id is None or not p.is_perishable or p.current_stock <= 0:
            continue
        first = units_first_half.get(p.id, 0.0)
        second = units_second_half.get(p.id, 0.0)
        if second < first and first > 0:
            wastage_risk.append(
                WastageRiskItem(
                    product_id=p.id, name=p.name, stock=p.current_stock, trend="declining"
                )
            )
    wastage_risk.sort(key=lambda w: w.stock, reverse=True)
    wastage_risk = wastage_risk[:WASTAGE_RISK_LIMIT]

    # --- margin_leaders: (selling - cost) * units -----------------------
    margin_leaders = [
        MarginLeader(
            product_id=pid,
            name=product_by_id[pid].name,
            margin_paise=margin_by_pid[pid],
            units=units_by_pid[pid],
        )
        for pid in margin_by_pid
        if pid in product_by_id and margin_by_pid[pid] > 0
    ]
    margin_leaders.sort(key=lambda m: m.margin_paise, reverse=True)
    margin_leaders = margin_leaders[:MARGIN_LEADERS_LIMIT]

    # --- pairings: co-occurrence within the same sale -------------------
    pair_counts: dict[tuple[int, int], int] = defaultdict(int)
    for pids in products_per_sale.values():
        sorted_pids = sorted(p for p in pids if p in product_by_id)
        for i in range(len(sorted_pids)):
            for j in range(i + 1, len(sorted_pids)):
                pair_counts[(sorted_pids[i], sorted_pids[j])] += 1
    pairings = [
        Pairing(a=product_by_id[a].name, b=product_by_id[b].name, count=c)
        for (a, b), c in pair_counts.items()
        if c >= PAIRING_MIN_COUNT
    ]
    pairings.sort(key=lambda p: p.count, reverse=True)
    pairings = pairings[:PAIRINGS_LIMIT]

    return InsightsSummaryResponse(
        revenue_today_paise=revenue_today,
        revenue_week_paise=revenue_week,
        top_movers=top_movers,
        dead_stock=dead_stock,
        running_low=running_low,
        wastage_risk=wastage_risk,
        margin_leaders=margin_leaders,
        pairings=pairings,
    )


def evaluate_alerts(
    session: Session,
    merchant_id: int,
    affected_product_ids: list[int],
) -> list[AlertOut]:
    """Check each affected product for reorder/stockout thresholds, persist Alert rows,
    and return them with Hindi spoken_message attached for TTS playback.

    Run AFTER a confirmed sale has decremented stock and the session is flushed enough
    that `product.current_stock` reflects the new value.
    """
    out: list[AlertOut] = []

    for pid in dict.fromkeys(affected_product_ids):  # dedupe, preserve order
        product = session.get(Product, pid)
        if product is None or product.merchant_id != merchant_id:
            continue

        if product.current_stock <= 0:
            alert_type, severity = AlertType.stockout, Severity.critical
        elif product.current_stock <= product.reorder_point:
            alert_type, severity = AlertType.reorder, Severity.warning
        else:
            continue

        message, spoken = _messages(product, alert_type)

        alert = Alert(
            merchant_id=merchant_id,
            type=alert_type,
            severity=severity,
            product_id=product.id,
            message=message,
        )
        session.add(alert)
        session.flush()

        out.append(
            AlertOut(
                id=alert.id,
                type=alert.type,
                severity=alert.severity,
                product_id=alert.product_id,
                message=alert.message,
                spoken_message=spoken,
                created_at=alert.created_at,
                dismissed=alert.dismissed,
            )
        )

    return out
