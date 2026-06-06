# Backend — Dukaan IQ (FastAPI + Sarvam)

Read root `CLAUDE.md` first — its rules (contracts are law, paise, two-step sales,
untrusted LLM output) all apply here. This file adds backend specifics.

## Stack
Python 3.11+ · FastAPI + Uvicorn · Pydantic v2 · SQLModel over a single-file SQLite DB
(`dukaaniq.db`) · httpx for any raw HTTP · rapidfuzz for catalog matching ·
python-multipart for audio/image uploads · `sarvamai` SDK for all AI calls.

## Layout (keep services thin, routers thinner)
```
backend/
  main.py              # app, CORS (allow Expo origin), static /audio mount, router includes
  db.py                # engine, session dependency, create_all on startup
  models.py            # SQLModel tables — exactly the schema in DATA_CONTRACTS.md §2
  schemas.py           # Pydantic request/response models — match API_CONTRACTS.md
  seed.py              # 30-SKU seed + ~14 days history; used by /admin/reset
  routers/             # auth, products, sales, insights, assistant, admin
  services/
    speech.py          # Sarvam Saaras STT
    parse.py           # Sarvam chat → ParsedSale JSON (validated)
    voice.py           # Sarvam Bulbul TTS → wav file under /audio
    ocr.py             # Sarvam Vision (P2 stub)
    match.py           # rapidfuzz resolution (DATA_CONTRACTS.md §3.3) — deterministic, not the LLM
    insights.py        # heuristics in DATA_CONTRACTS.md §5 / PRD §10.3, computed on demand
```

## Sarvam rules — this is where generated code most often goes wrong
- **Install and rely on the official Sarvam skills** (see PLAYBOOK.md): they are correction
  layers for the exact `sarvamai` call signatures that get hallucinated. Trust them and the
  installed package over memory. If unsure of a signature, inspect the installed package
  (`python -c "import sarvamai, inspect; ..."`) rather than guessing.
- Known gotchas to respect: chat is `client.chat.completions(...)` (**no `.create()`**);
  client is constructed with `api_subscription_key=...`; some Bulbul v3 params (pitch/loudness)
  error out. Confirm exact STT/TTS arg names against the skill/package.
- **Keys live only on the backend.** Read `SARVAM_API_KEY` from env; never log it, never
  return it, never expose a Sarvam-calling endpoint that forwards the key.
- Wrap every Sarvam call in try/except and map failures to the standard error envelope
  codes: `stt_failed`, `parse_failed`, `ocr_failed`, `tts_failed`, `upstream_timeout`.

## The parse boundary (most important backend logic)
`services/parse.py` sends the canonical system prompt from DATA_CONTRACTS.md §3.2,
gets back text, strips stray ```` ```json ```` fences defensively, `json.loads`, then
validates against the `ParsedSale` Pydantic model. On any failure → return the raw
transcript so the route can respond with `parse_failed` + transcript (never 500 silently).
Post-LLM resolution (fuzzy match, price/total math, confidence flagging) is **deterministic
backend code** in `services/match.py`, following DATA_CONTRACTS.md §3.3 — not the LLM's job.

## Errors & responses
Every non-`/health` endpoint requires the bearer token → resolves to `merchant_id`.
All errors use: `{"error": {"code": "...", "message": "...", "detail": null}}`.
Return exactly the response shapes in API_CONTRACTS.md, including `spoken_message` on alerts.

## Don't
Don't add Alembic/migrations (SQLite + `create_all` is fine for the sprint). Don't add
real auth, async job queues, or ML. Don't change seed stock numbers (demo invariant).
