# Dukaan IQ — API_CONTRACTS.md

FastAPI REST contract for the MVP. Base URL = the tunnel (cloudflared/ngrok) URL set in the app `.env`.

**Conventions**
- All money in **paise (int)**.
- Auth: `Authorization: Bearer <STATIC_DEMO_TOKEN>` on every endpoint except `/health`. (Mock — single demo merchant; the token resolves to `merchant_id`.)
- Content-Type `application/json` unless multipart noted.
- Timestamps ISO-8601 UTC.
- Standard error envelope:
```json
{ "error": { "code": "STRING_CODE", "message": "human readable", "detail": null } }
```
Codes: `unauthorized`, `not_found`, `validation_error`, `stt_failed`, `parse_failed`, `ocr_failed`, `tts_failed`, `upstream_timeout`.

---

## Health & admin

### `GET /health`
→ `200 { "status": "ok" }`

### `POST /admin/reset`
Wipes sales + alerts, re-seeds inventory. Re-runnable demo.
→ `200 { "status": "reset", "products": 30 }`

---

## Auth (mock)

### `POST /auth/login`
Req: `{ "phone": "9800000000" }`
→ `200`
```json
{
  "token": "demo-static-token",
  "merchant": {
    "id": 1, "name": "Ramesh Kirana Store",
    "language": "hi-IN", "business_type": "kirana"
  }
}
```

### `GET /merchant/me`
→ `200` merchant object (as above).

---

## Inventory

### `GET /products`
Query: `?q=` (optional search), `?low_only=true` (optional).
→ `200`
```json
{ "products": [
  { "id": 12, "name": "Parle-G Biscuit", "category": "snacks", "unit": "packet",
    "cost_price": 800, "selling_price": 1000, "current_stock": 4,
    "reorder_point": 10, "is_perishable": false, "last_sold_at": "2026-06-06T08:11:00Z" }
] }
```

### `POST /products`
Req:
```json
{ "name": "Maggi 70g", "aliases": ["maggi","noodles"], "category": "snacks",
  "unit": "packet", "cost_price": 1200, "selling_price": 1400,
  "current_stock": 30, "reorder_point": 10, "is_perishable": false }
```
→ `201` created product object.

### `PATCH /products/{id}`
Req: any subset of mutable fields (`selling_price`, `current_stock`, `reorder_point`, `aliases`, ...).
→ `200` updated product. `404 not_found` if missing.

---

## Sales — the hero flow (two steps: parse → confirm)

### `POST /sales/voice`  *(multipart)*
Transcribe + parse audio into an **unconfirmed draft**. Does **not** persist.
- multipart fields: `audio` (file, m4a/wav), `language` (optional, e.g. `hi-IN`; defaults to merchant language)

→ `200`
```json
{
  "draft_id": "tmp_8f1c",
  "source": "voice",
  "transcript": "do kilo aata aur ek parle g pachpan rupaye",
  "language_detected": "hi-IN",
  "needs_clarification": false,
  "clarification": null,
  "line_items": [
    { "product_id": 7, "matched_name": "Aashirvaad Atta 1kg", "qty": 2, "unit": "kg",
      "unit_price": 5500, "line_total": 11000, "match_confidence": 0.96 },
    { "product_id": 12, "matched_name": "Parle-G Biscuit", "qty": 1, "unit": "packet",
      "unit_price": 1000, "line_total": 1000, "match_confidence": 0.91 }
  ],
  "total_amount": 12000
}
```
Errors: `400 stt_failed`, `400 parse_failed` (response still includes `transcript` so the app can fall back to manual edit), `504 upstream_timeout`.

> The `draft_id` is an in-memory/cache handle; the client echoes back the (possibly edited) `line_items` on confirm. If you skip server-side caching, just send the full line items on confirm — see below.

### `POST /sales/confirm`
Persist a (possibly edited) draft. Decrements stock, recomputes alerts.
Req:
```json
{
  "source": "voice",
  "raw_input": "do kilo aata aur ek parle g pachpan rupaye",
  "line_items": [
    { "product_id": 7, "qty": 2, "unit": "kg", "unit_price": 5500 },
    { "product_id": 12, "qty": 1, "unit": "packet", "unit_price": 1000 }
  ]
}
```
→ `201`
```json
{
  "sale": { "id": 153, "total_amount": 12000, "confirmed": true,
            "created_at": "2026-06-06T09:02:11Z" },
  "stock_updates": [
    { "product_id": 12, "new_stock": 3 }
  ],
  "alerts": [
    { "id": 44, "type": "reorder", "severity": "warning", "product_id": 12,
      "message": "Parle-G is down to 3 packets — reorder soon?",
      "spoken_message": "Parle-G sirf teen packet bacha hai, dobara order karein?" }
  ]
}
```
`alerts` may be empty. If non-empty, the app should speak `spoken_message` (call `/assistant/speak` or use the inline audio if provided).

### `POST /sales/ocr`  *(multipart)*  — P2 stub
- multipart: `image` (file)
→ `200` same draft shape as `/sales/voice` with `"source": "ocr"` and `transcript` = OCR'd text. Then reuse `/sales/confirm`.
Errors: `400 ocr_failed`.

### `GET /sales`
Query: `?from=&to=` (ISO dates, optional).
→ `200 { "sales": [ { "id", "total_amount", "source", "created_at", "line_items":[...] } ] }`

---

## Insights

### `GET /insights/summary`
→ `200` — the full insight object (see DATA_CONTRACTS.md §5: `revenue_today_paise`, `top_movers`, `dead_stock`, `running_low`, `wastage_risk`, `margin_leaders`, `pairings`).

### `GET /insights/alerts`
Query: `?include_dismissed=false`
→ `200 { "alerts": [ { "id","type","severity","product_id","message","spoken_message","created_at","dismissed" } ] }`

### `POST /insights/alerts/{id}/dismiss`
→ `200 { "id": 44, "dismissed": true }`

---

## Voice assistant

### `POST /assistant/query`  *(multipart OR json)*
Ask a question by voice or text; answered from the merchant's own data.
- multipart: `audio` (file), OR json: `{ "text": "is hafte sabse zyada kya bika?" }`
- optional `language`

→ `200`
```json
{
  "question_text": "is hafte sabse zyada kya bika?",
  "answer_text": "Is hafte sabse zyada Parle-G bika — 47 packet, ₹470 ka.",
  "answer_audio_url": "/audio/ans_91a2.wav",
  "data": { "top_movers": [ { "name": "Parle-G", "units": 47 } ] }
}
```
Pipeline: STT (if audio) → Sarvam-30B answers using a compact JSON of the merchant's insight data injected into context → Bulbul TTS. `data` is the structured backing so the app can render a card alongside the spoken answer.
Errors: `400 stt_failed`, `400 tts_failed`.

### `POST /assistant/speak`
Utility TTS for any string (used to speak alerts/confirmations).
Req: `{ "text": "Parle-G sirf teen packet bacha hai.", "language": "hi-IN" }`
→ `200 { "audio_url": "/audio/spk_77.wav" }`

### `GET /audio/{filename}`
Serves generated TTS wav files (static, short-lived). → `200 audio/wav`

---

## Endpoint summary

| Method | Path | Purpose | Priority |
|--------|------|---------|----------|
| GET | /health | liveness | P0 |
| POST | /admin/reset | re-seed for demo | P0 |
| POST | /auth/login | mock login | P0 |
| GET | /merchant/me | current merchant | P1 |
| GET | /products | inventory list | P0 |
| POST | /products | add item | P1 |
| PATCH | /products/{id} | edit item | P1 |
| POST | /sales/voice | transcribe+parse → draft | P0 |
| POST | /sales/confirm | persist + decrement + alerts | P0 |
| POST | /sales/ocr | OCR → draft (stub) | P2 |
| GET | /sales | sales history | P1 |
| GET | /insights/summary | dashboard insights | P0 |
| GET | /insights/alerts | proactive alerts | P1 |
| POST | /insights/alerts/{id}/dismiss | dismiss | P2 |
| POST | /assistant/query | voice/text Q&A over data | P1 |
| POST | /assistant/speak | TTS utility | P1 |
| GET | /audio/{file} | serve TTS audio | P1 |

> **Minimal demo path = P0 only:** reset → login → products → voice → confirm → insights/summary. Build that spine first; everything else is enhancement.
