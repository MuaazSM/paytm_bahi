from typing import Iterable

from rapidfuzz import fuzz, process

from models import Product
from schemas import ParsedItem, SaleDraftLineItem


LOW_CONFIDENCE_THRESHOLD = 0.7


def _build_index(products: Iterable[Product]) -> tuple[list[str], list[Product]]:
    """Flatten products into parallel (alias_string, product) lists for rapidfuzz."""
    choices: list[str] = []
    owners: list[Product] = []
    for p in products:
        candidates = [p.name] + list(p.aliases or [])
        for c in candidates:
            if not c:
                continue
            choices.append(c.lower())
            owners.append(p)
    return choices, owners


def _best_match(name: str, choices: list[str], owners: list[Product]) -> tuple[Product | None, float]:
    if not choices:
        return None, 0.0
    result = process.extractOne(name.lower(), choices, scorer=fuzz.WRatio)
    if result is None:
        return None, 0.0
    _matched, score, idx = result
    return owners[idx], score / 100.0


def resolve_items(items: list[ParsedItem], products: list[Product]) -> list[SaleDraftLineItem]:
    """Resolve ParsedItems (raw LLM output) against the merchant's catalog.

    Per DATA_CONTRACTS.md §3.3:
      1. fuzzy-match name → best product_id + match_confidence
      2. unit_price null → product.selling_price
      3. price_is_total → unit_price = round(price / qty)
      4. line_total = round(qty * unit_price)
      5. match_confidence < 0.7 stays in the draft, flagged for UI review
    """
    choices, owners = _build_index(products)
    resolved: list[SaleDraftLineItem] = []

    for item in items:
        product, confidence = _best_match(item.name, choices, owners)

        qty = item.qty if item.qty and item.qty > 0 else 1.0

        if item.unit_price is None:
            unit_price = product.selling_price if product else 0
        elif item.price_is_total:
            unit_price = round(item.unit_price / qty) if qty else item.unit_price
        else:
            unit_price = item.unit_price

        line_total = round(qty * unit_price)

        resolved.append(
            SaleDraftLineItem(
                product_id=product.id if product else None,
                matched_name=product.name if product else item.name,
                qty=qty,
                unit=product.unit if product else item.unit,
                unit_price=unit_price,
                line_total=line_total,
                match_confidence=round(confidence, 2),
            )
        )

    return resolved
