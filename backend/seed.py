import random
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, delete, select

from models import (
    Alert,
    BusinessType,
    Merchant,
    Product,
    Sale,
    SaleLineItem,
    SaleSource,
    Unit,
)

SEED_MERCHANT = {
    "name": "Ramesh Kirana Store",
    "phone": "9800000000",
    "language": "hi-IN",
    "business_type": BusinessType.kirana,
}

# 30 SKUs. Money in paise. Parle-G invariant: stock=4, reorder_point=10.
SEED_PRODUCTS: list[dict] = [
    {
        "name": "Parle-G Biscuit",
        "aliases": ["parle", "parle g", "parleg", "biscuit", "biskut"],
        "category": "snacks", "unit": Unit.packet,
        "cost_price": 800, "selling_price": 1000,
        "current_stock": 4, "reorder_point": 10, "is_perishable": False,
    },
    {
        "name": "Aashirvaad Atta 1kg",
        "aliases": ["aata", "atta", "wheat flour", "aashirvaad", "ashirvad"],
        "category": "staples", "unit": Unit.kg,
        "cost_price": 5000, "selling_price": 5500,
        "current_stock": 22, "reorder_point": 8, "is_perishable": False,
    },
    {
        "name": "Tata Salt 1kg",
        "aliases": ["namak", "salt", "tata salt"],
        "category": "staples", "unit": Unit.packet,
        "cost_price": 2400, "selling_price": 2800,
        "current_stock": 30, "reorder_point": 8, "is_perishable": False,
    },
    {
        "name": "Fortune Sunflower Oil 1L",
        "aliases": ["tel", "oil", "sunflower oil", "fortune"],
        "category": "staples", "unit": Unit.litre,
        "cost_price": 14000, "selling_price": 15500,
        "current_stock": 18, "reorder_point": 6, "is_perishable": False,
    },
    {
        "name": "Tata Tea Gold 250g",
        "aliases": ["chai", "tea", "chai patti", "tata tea"],
        "category": "beverages", "unit": Unit.packet,
        "cost_price": 13500, "selling_price": 15000,
        "current_stock": 14, "reorder_point": 5, "is_perishable": False,
    },
    {
        "name": "Nescafe Classic 50g",
        "aliases": ["coffee", "nescafe", "kaapi"],
        "category": "beverages", "unit": Unit.packet,
        "cost_price": 16000, "selling_price": 18500,
        "current_stock": 9, "reorder_point": 4, "is_perishable": False,
    },
    {
        "name": "Amul Milk 500ml",
        "aliases": ["doodh", "milk", "amul milk"],
        "category": "dairy", "unit": Unit.packet,
        "cost_price": 2600, "selling_price": 3000,
        "current_stock": 14, "reorder_point": 12, "is_perishable": True,
    },
    {
        "name": "Amul Butter 100g",
        "aliases": ["makhan", "butter", "amul butter"],
        "category": "dairy", "unit": Unit.packet,
        "cost_price": 5200, "selling_price": 5800,
        "current_stock": 8, "reorder_point": 4, "is_perishable": True,
    },
    {
        "name": "Amul Paneer 200g",
        "aliases": ["paneer", "amul paneer"],
        "category": "dairy", "unit": Unit.packet,
        "cost_price": 8500, "selling_price": 9500,
        "current_stock": 6, "reorder_point": 3, "is_perishable": True,
    },
    {
        "name": "Mother Dairy Curd 400g",
        "aliases": ["dahi", "curd", "yogurt", "mother dairy"],
        "category": "dairy", "unit": Unit.packet,
        "cost_price": 4000, "selling_price": 4500,
        "current_stock": 10, "reorder_point": 5, "is_perishable": True,
    },
    {
        "name": "Britannia Bread",
        "aliases": ["bread", "double roti", "pav", "britannia bread"],
        "category": "bakery", "unit": Unit.packet,
        "cost_price": 3500, "selling_price": 4000,
        "current_stock": 7, "reorder_point": 5, "is_perishable": True,
    },
    {
        "name": "Maggi Noodles 70g",
        "aliases": ["maggi", "noodles", "instant noodles"],
        "category": "snacks", "unit": Unit.packet,
        "cost_price": 1200, "selling_price": 1400,
        "current_stock": 40, "reorder_point": 12, "is_perishable": False,
    },
    {
        "name": "Lays Classic 52g",
        "aliases": ["lays", "chips", "wafer"],
        "category": "snacks", "unit": Unit.packet,
        "cost_price": 1600, "selling_price": 2000,
        "current_stock": 26, "reorder_point": 10, "is_perishable": False,
    },
    {
        "name": "Kurkure Masala Munch",
        "aliases": ["kurkure", "namkeen chips"],
        "category": "snacks", "unit": Unit.packet,
        "cost_price": 1600, "selling_price": 2000,
        "current_stock": 22, "reorder_point": 10, "is_perishable": False,
    },
    {
        "name": "Haldiram Bhujia 200g",
        "aliases": ["bhujia", "namkeen", "haldiram"],
        "category": "snacks", "unit": Unit.packet,
        "cost_price": 6500, "selling_price": 7500,
        "current_stock": 12, "reorder_point": 5, "is_perishable": False,
    },
    {
        "name": "Coca Cola 750ml",
        "aliases": ["coke", "coca cola", "cold drink", "thanda"],
        "category": "beverages", "unit": Unit.packet,
        "cost_price": 3200, "selling_price": 4000,
        "current_stock": 18, "reorder_point": 8, "is_perishable": False,
    },
    {
        "name": "Thums Up 750ml",
        "aliases": ["thums up", "thumps up", "cold drink"],
        "category": "beverages", "unit": Unit.packet,
        "cost_price": 3200, "selling_price": 4000,
        "current_stock": 16, "reorder_point": 8, "is_perishable": False,
    },
    {
        "name": "Bisleri Water 1L",
        "aliases": ["pani", "water", "bisleri", "bottle"],
        "category": "beverages", "unit": Unit.litre,
        "cost_price": 1500, "selling_price": 2000,
        "current_stock": 24, "reorder_point": 10, "is_perishable": False,
    },
    {
        "name": "Dabur Honey 250g",
        "aliases": ["shahad", "honey", "dabur honey"],
        "category": "staples", "unit": Unit.packet,
        "cost_price": 14000, "selling_price": 16500,
        "current_stock": 8, "reorder_point": 3, "is_perishable": False,
    },
    {
        "name": "MDH Garam Masala 100g",
        "aliases": ["masala", "garam masala", "mdh"],
        "category": "spices", "unit": Unit.packet,
        "cost_price": 7000, "selling_price": 8500,
        "current_stock": 11, "reorder_point": 4, "is_perishable": False,
    },
    {
        "name": "Everest Haldi 100g",
        "aliases": ["haldi", "turmeric", "everest"],
        "category": "spices", "unit": Unit.packet,
        "cost_price": 3500, "selling_price": 4500,
        "current_stock": 15, "reorder_point": 5, "is_perishable": False,
    },
    {
        "name": "Surf Excel 1kg",
        "aliases": ["surf", "detergent", "washing powder", "surf excel"],
        "category": "household", "unit": Unit.packet,
        "cost_price": 18000, "selling_price": 21000,
        "current_stock": 9, "reorder_point": 4, "is_perishable": False,
    },
    {
        "name": "Vim Bar 200g",
        "aliases": ["vim", "dish soap", "vim bar"],
        "category": "household", "unit": Unit.piece,
        "cost_price": 1800, "selling_price": 2200,
        "current_stock": 20, "reorder_point": 8, "is_perishable": False,
    },
    {
        "name": "Colgate MaxFresh 150g",
        "aliases": ["colgate", "toothpaste", "manjan"],
        "category": "personal care", "unit": Unit.piece,
        "cost_price": 7500, "selling_price": 9000,
        "current_stock": 12, "reorder_point": 5, "is_perishable": False,
    },
    {
        "name": "Lifebuoy Soap 125g",
        "aliases": ["lifebuoy", "soap", "sabun"],
        "category": "personal care", "unit": Unit.piece,
        "cost_price": 3000, "selling_price": 3500,
        "current_stock": 25, "reorder_point": 10, "is_perishable": False,
    },
    {
        "name": "Clinic Plus Shampoo Sachet",
        "aliases": ["shampoo", "clinic plus", "sachet"],
        "category": "personal care", "unit": Unit.piece,
        "cost_price": 200, "selling_price": 400,
        "current_stock": 120, "reorder_point": 40, "is_perishable": False,
    },
    {
        "name": "Head & Shoulders 180ml",
        "aliases": ["head and shoulders", "shampoo bottle", "anti dandruff"],
        "category": "personal care", "unit": Unit.piece,
        "cost_price": 18500, "selling_price": 22000,
        "current_stock": 6, "reorder_point": 3, "is_perishable": False,
    },
    {
        "name": "Gillette Razor",
        "aliases": ["razor", "gillette", "shaving"],
        "category": "personal care", "unit": Unit.piece,
        "cost_price": 6500, "selling_price": 8000,
        "current_stock": 10, "reorder_point": 4, "is_perishable": False,
    },
    {
        "name": "Set Wet Hair Gel 200ml",
        "aliases": ["hair gel", "set wet", "gel"],
        "category": "personal care", "unit": Unit.piece,
        "cost_price": 12000, "selling_price": 15000,
        "current_stock": 8, "reorder_point": 3, "is_perishable": False,
    },
    {
        "name": "Cadbury Dairy Milk 50g",
        "aliases": ["cadbury", "dairy milk", "chocolate"],
        "category": "snacks", "unit": Unit.piece,
        "cost_price": 4000, "selling_price": 5000,
        "current_stock": 30, "reorder_point": 10, "is_perishable": False,
    },
]


# Daily volume plan for history generation. Products NOT listed here become
# dead stock (no sales in the 14-day window). Tuple = (lo, hi) sales per day,
# qty_opts = list of (qty, unit) the sale uses.
_DAILY_PLAN: list[tuple[str, tuple[int, int], list[tuple[float, Unit]]]] = [
    # Top movers
    ("Parle-G Biscuit", (4, 7), [(1, Unit.packet), (2, Unit.packet)]),
    ("Maggi Noodles 70g", (3, 6), [(1, Unit.packet), (2, Unit.packet)]),
    ("Amul Milk 500ml", (3, 5), [(1, Unit.packet), (2, Unit.packet)]),
    ("Lays Classic 52g", (2, 5), [(1, Unit.packet)]),
    ("Bisleri Water 1L", (2, 4), [(1.0, Unit.litre), (2.0, Unit.litre)]),
    ("Lifebuoy Soap 125g", (1, 3), [(1, Unit.piece)]),
    # Margin leader (cheap to source, marked up ~100%, sells in volume)
    ("Clinic Plus Shampoo Sachet", (8, 14), [(1, Unit.piece), (2, Unit.piece), (3, Unit.piece)]),
    # Steady mid-volume
    ("Mother Dairy Curd 400g", (1, 3), [(1, Unit.packet)]),
    ("Cadbury Dairy Milk 50g", (1, 3), [(1, Unit.piece), (2, Unit.piece)]),
    ("Kurkure Masala Munch", (0, 2), [(1, Unit.packet)]),
    ("Haldiram Bhujia 200g", (0, 2), [(1, Unit.packet)]),
    ("Coca Cola 750ml", (0, 3), [(1, Unit.packet), (2, Unit.packet)]),
    ("Thums Up 750ml", (0, 2), [(1, Unit.packet)]),
    ("Tata Tea Gold 250g", (0, 2), [(1, Unit.packet)]),
    ("Tata Salt 1kg", (0, 2), [(1, Unit.packet)]),
    ("Aashirvaad Atta 1kg", (0, 2), [(1.0, Unit.kg), (2.0, Unit.kg)]),
    ("Fortune Sunflower Oil 1L", (0, 1), [(1.0, Unit.litre)]),
    ("Colgate MaxFresh 150g", (0, 2), [(1, Unit.piece)]),
    ("Vim Bar 200g", (0, 2), [(1, Unit.piece)]),
    ("MDH Garam Masala 100g", (0, 1), [(1, Unit.packet)]),
    ("Everest Haldi 100g", (0, 1), [(1, Unit.packet)]),
    ("Nescafe Classic 50g", (0, 1), [(1, Unit.packet)]),
]
# Products intentionally absent → dead_stock candidates:
#   "Set Wet Hair Gel 200ml", "Head & Shoulders 180ml",
#   "Gillette Razor", "Dabur Honey 250g", "Surf Excel 1kg"


def _add_sale(
    session: Session,
    merchant_id: int,
    product: Product,
    qty: float,
    unit: Unit,
    ts: datetime,
    last_sold: dict[int, datetime],
) -> None:
    unit_price = product.selling_price
    line_total = round(qty * unit_price)
    sale = Sale(
        merchant_id=merchant_id,
        source=SaleSource.voice,
        raw_input=None,
        total_amount=line_total,
        confirmed=True,
        created_at=ts,
    )
    session.add(sale)
    session.flush()
    session.add(
        SaleLineItem(
            sale_id=sale.id,
            product_id=product.id,
            matched_name=product.name,
            qty=qty,
            unit=unit,
            unit_price=unit_price,
            line_total=line_total,
            match_confidence=1.0,
        )
    )
    prev = last_sold.get(product.id)
    if prev is None or prev < ts:
        last_sold[product.id] = ts


def _generate_history(session: Session, merchant_id: int, products: list[Product]) -> None:
    by_name = {p.name: p for p in products}
    rng = random.Random(42)
    now = datetime.now(timezone.utc)
    last_sold: dict[int, datetime] = {}

    # 14 days history + today's lighter load so revenue_today is non-zero.
    for days_ago in range(14, -1, -1):
        day = now - timedelta(days=days_ago)
        is_today = days_ago == 0

        for name, (lo, hi), qty_opts in _DAILY_PLAN:
            product = by_name.get(name)
            if product is None:
                continue
            count = rng.randint(lo, hi)
            if is_today:
                count = max(0, count // 2)  # partial day
            for _ in range(count):
                qty, unit = rng.choice(qty_opts)
                hour = rng.randint(8, 20)
                if is_today:
                    hour = rng.randint(8, max(9, min(20, datetime.now(timezone.utc).hour)))
                ts = day.replace(hour=hour, minute=rng.randint(0, 59), second=0, microsecond=0)
                _add_sale(session, merchant_id, product, qty, unit, ts, last_sold)

        # Bread + Butter pairing (for the "saath bikte hain" insight)
        if rng.random() < 0.6:
            bread = by_name["Britannia Bread"]
            butter = by_name["Amul Butter 100g"]
            ts = day.replace(hour=18, minute=rng.randint(0, 59), second=0, microsecond=0)
            total = bread.selling_price + butter.selling_price
            sale = Sale(
                merchant_id=merchant_id,
                source=SaleSource.voice,
                raw_input=None,
                total_amount=total,
                confirmed=True,
                created_at=ts,
            )
            session.add(sale)
            session.flush()
            for prod in (bread, butter):
                session.add(
                    SaleLineItem(
                        sale_id=sale.id,
                        product_id=prod.id,
                        matched_name=prod.name,
                        qty=1,
                        unit=Unit.packet,
                        unit_price=prod.selling_price,
                        line_total=prod.selling_price,
                        match_confidence=1.0,
                    )
                )
                prev = last_sold.get(prod.id)
                if prev is None or prev < ts:
                    last_sold[prod.id] = ts

        # Wastage risk: Amul Paneer sold only in the older half of the window
        # (declining sell-through → wastage_risk insight).
        if days_ago > 7 and rng.random() < 0.7:
            paneer = by_name["Amul Paneer 200g"]
            ts = day.replace(hour=11, minute=rng.randint(0, 59), second=0, microsecond=0)
            _add_sale(session, merchant_id, paneer, 1, Unit.packet, ts, last_sold)

    session.commit()

    # Stamp last_sold_at on the products that actually moved.
    for product_id, ts in last_sold.items():
        product = session.get(Product, product_id)
        if product is not None:
            product.last_sold_at = ts
            session.add(product)
    session.commit()


def reseed(session: Session) -> int:
    """Wipe sales/alerts/products/merchants and re-seed. Returns product count."""
    session.exec(delete(Alert))
    session.exec(delete(SaleLineItem))
    session.exec(delete(Sale))
    session.exec(delete(Product))
    session.exec(delete(Merchant))
    session.commit()

    merchant = Merchant(**SEED_MERCHANT)
    session.add(merchant)
    session.commit()
    session.refresh(merchant)

    products: list[Product] = []
    for p in SEED_PRODUCTS:
        product = Product(merchant_id=merchant.id, **p)
        session.add(product)
        products.append(product)
    session.commit()
    for p in products:
        session.refresh(p)

    _generate_history(session, merchant.id, products)
    return len(SEED_PRODUCTS)


def ensure_seeded(session: Session) -> None:
    existing = session.exec(select(Merchant)).first()
    if existing is None:
        reseed(session)
