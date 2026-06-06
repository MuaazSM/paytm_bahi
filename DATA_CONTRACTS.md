# Dukaan IQ — DATA_CONTRACTS.md

Canonical data shapes for the MVP. Covers: SQLite/SQLModel schema, enums, the strict **LLM parsing contract** (the most important boundary in the system), Sarvam response shapes we depend on, the insight/alert objects, and seed data structure.

> Money is stored in **paise (integer)** to avoid float errors. `unit_price`, `cost_price`, `selling_price`, `line_total` are all integers in paise. UI divides by 100 for display.

---

## 1. Enums

```python
class SaleSource(str, Enum):
    voice = "voice"
    ocr = "ocr"
    manual = "manual"

class Unit(str, Enum):
    piece = "piece"     # default for countable goods
    kg = "kg"
    gram = "gram"
    litre = "litre"
    ml = "ml"
    packet = "packet"
    dozen = "dozen"

class AlertType(str, Enum):
    reorder = "reorder"          # stock at/below reorder point
    stockout = "stockout"        # stock hit zero
    dead_stock = "dead_stock"    # no sale in N days
    wastage_risk = "wastage_risk"# perishable + declining sell-through
    margin_leader = "margin_leader"
    pairing = "pairing"          # frequently bought together

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
```

---

## 2. Database schema (SQLModel over SQLite)

### 2.1 `merchant`
| column | type | notes |
|--------|------|-------|
| id | int PK | |
| name | str | "Ramesh Kirana Store" |
| phone | str | mock identity |
| language | str | BCP-47, e.g. `hi-IN`, `mr-IN` — drives STT/TTS lang |
| business_type | BusinessType | |
| created_at | datetime | UTC |

### 2.2 `product` (the SKU / item catalog — the new primitive)
| column | type | notes |
|--------|------|-------|
| id | int PK | |
| merchant_id | int FK → merchant.id | |
| name | str | canonical display name, e.g. "Aashirvaad Atta 1kg" |
| aliases | JSON (list[str]) | voice-matching synonyms: `["aata","atta","wheat flour","aashirvaad"]` |
| category | str | "staples", "snacks", "personal care" |
| unit | Unit | base selling unit |
| cost_price | int (paise) | for margin calc |
| selling_price | int (paise) | default price if voice omits it |
| current_stock | float | units on hand (float allows 1.5 kg) |
| reorder_point | float | threshold that triggers reorder alert |
| is_perishable | bool | drives wastage logic |
| last_sold_at | datetime \| null | updated on each sale; drives dead-stock |
| created_at | datetime | |

`aliases` is what makes constrained-vocabulary matching work — populate it well in the seed.

### 2.3 `sale`
| column | type | notes |
|--------|------|-------|
| id | int PK | |
| merchant_id | int FK | |
| source | SaleSource | voice / ocr / manual |
| raw_input | str \| null | the STT transcript or OCR text (provenance/debug) |
| total_amount | int (paise) | sum of line totals |
| confirmed | bool | only confirmed sales count in insights |
| created_at | datetime | |

### 2.4 `sale_line_item`
| column | type | notes |
|--------|------|-------|
| id | int PK | |
| sale_id | int FK → sale.id | |
| product_id | int FK → product.id \| null | null if unmatched (manual review) |
| matched_name | str | name as resolved |
| qty | float | |
| unit | Unit | |
| unit_price | int (paise) | |
| line_total | int (paise) | `round(qty * unit_price)` |
| match_confidence | float | 0–1 from fuzzy matcher; <0.7 flagged in UI |

### 2.5 `alert`
| column | type | notes |
|--------|------|-------|
| id | int PK | |
| merchant_id | int FK | |
| type | AlertType | |
| severity | Severity | |
| product_id | int FK \| null | |
| message | str | localized, ready to display/speak |
| created_at | datetime | |
| dismissed | bool | default false |

---

## 3. The LLM parsing contract (CRITICAL BOUNDARY)

The transcript → structured-items step is the crux. The LLM **must** return JSON only — no prose, no markdown fences. The backend validates against this Pydantic model and never inserts unvalidated LLM text into the DB.

### 3.1 Output schema — `ParsedSale`
```jsonc
{
  "items": [
    {
      "name": "string",      // item name as spoken, raw (e.g. "aata")
      "qty": 2.0,            // number; default 1 if unspecified
      "unit": "kg",          // one of Unit enum; "piece" if unspecified
      "unit_price": 5500,    // paise; null if the merchant didn't say a price
      "price_is_total": false // true if the spoken price was for the whole line, not per-unit
    }
  ],
  "language_detected": "hi-IN",
  "needs_clarification": false,
  "clarification": null        // string question if ambiguous, else null
}
```

### 3.2 Canonical system prompt (use verbatim-ish)
```
You convert an Indian shopkeeper's spoken sales note into structured JSON.
The merchant speaks Hindi/regional languages, often code-mixed with English,
using informal quantities ("do kilo", "ek packet", "paav").

Rules:
- Output ONLY valid JSON matching the schema. No prose, no markdown, no backticks.
- Quantities: convert words to numbers (do=2, teen=3, paav=0.25, aadha=0.5).
- unit must be one of: piece, kg, gram, litre, ml, packet, dozen. Default "piece".
- Prices are in rupees in speech; convert to paise (×100). If price is for the
  whole line not per unit, set price_is_total=true. If no price, unit_price=null.
- If the note is ambiguous or unparseable, set needs_clarification=true and put a
  short question in "clarification".
- Detect the spoken language as a BCP-47 code in language_detected.

Schema: { "items":[{"name","qty","unit","unit_price","price_is_total"}],
          "language_detected", "needs_clarification", "clarification" }
```

### 3.3 Post-LLM resolution (backend, deterministic — not the LLM's job)
1. For each parsed `name`, run `rapidfuzz` against every product's `name` + `aliases` for that merchant → best `product_id` + `match_confidence`.
2. If `unit_price` is null → use the matched product's `selling_price`.
3. If `price_is_total` → `unit_price = round(spoken_price / qty)`.
4. `line_total = round(qty * unit_price)`.
5. Items with `match_confidence < 0.7` → keep but flag for UI review (still editable before confirm).

---

## 4. Sarvam response shapes we depend on

We only depend on these fields; treat everything else as opaque.

**Saaras STT** → `{ "transcript": "string", "language_code": "hi-IN" }`
**Sarvam-30B chat** → standard chat completion; we read `choices[0].message.content` and `json.loads` it (after stripping any stray fences defensively).
**Bulbul TTS** → audio bytes (we save to a temp file and return a URL the app can play).
**Sarvam Vision (OCR)** → structured text/markdown of the document; we feed that text back through the same `ParsedSale` LLM contract in §3.

---

## 5. Insight objects (returned by /insights/summary)

```jsonc
{
  "revenue_today_paise": 412000,
  "revenue_week_paise": 2841500,
  "top_movers": [
    { "product_id": 12, "name": "Parle-G", "units": 47, "revenue_paise": 47000 }
  ],
  "dead_stock": [
    { "product_id": 31, "name": "Hair Gel 200ml", "days_since_sale": 26, "stock": 8 }
  ],
  "running_low": [
    { "product_id": 12, "name": "Parle-G", "stock": 3, "reorder_point": 10 }
  ],
  "wastage_risk": [
    { "product_id": 22, "name": "Amul Milk 500ml", "stock": 14, "trend": "declining" }
  ],
  "margin_leaders": [
    { "product_id": 9, "name": "Shampoo Sachet", "margin_paise": 18800, "units": 94 }
  ],
  "pairings": [
    { "a": "Bread", "b": "Butter", "count": 12 }
  ]
}
```

---

## 6. Seed data shape (pre-load before the demo)

~30 products for one kirana merchant. Keep aliases rich. Pre-create ~2 weeks of historical sales so insights are non-empty on first load.

```jsonc
{
  "merchant": {
    "name": "Ramesh Kirana Store", "phone": "9800000000",
    "language": "hi-IN", "business_type": "kirana"
  },
  "products": [
    {
      "name": "Parle-G Biscuit", "aliases": ["parle", "parle g", "biscuit", "biskut"],
      "category": "snacks", "unit": "packet",
      "cost_price": 800, "selling_price": 1000,
      "current_stock": 4, "reorder_point": 10, "is_perishable": false
    },
    {
      "name": "Aashirvaad Atta 1kg", "aliases": ["aata", "atta", "wheat flour", "aashirvaad"],
      "category": "staples", "unit": "kg",
      "cost_price": 5000, "selling_price": 5500,
      "current_stock": 22, "reorder_point": 8, "is_perishable": false
    }
    // ... ~28 more, mix of perishable (milk, bread, paneer) and non-perishable
  ],
  "historical_sales_days": 14
}
```

> **Demo tip:** set Parle-G `current_stock = 4` and `reorder_point = 10` so that the live voice sale ("ek Parle-G") tips it toward the reorder alert — that's your scripted "wow" moment.

---

## 7. Reset contract
`POST /admin/reset` wipes sales + alerts and re-seeds products to their seed `current_stock`, so the pitch can be re-run cleanly between judge groups.
