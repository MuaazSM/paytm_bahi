---
name: new-endpoint
description: Scaffold a FastAPI endpoint for Dukaan IQ — router, Pydantic request/response schemas, and service wiring — matching API_CONTRACTS.md exactly. Use when adding or implementing a backend route.
argument-hint: [METHOD /path  e.g. POST /sales/confirm]
disable-model-invocation: true
---

# New endpoint

Implement the endpoint named in `$ARGUMENTS` to match its spec in `API_CONTRACTS.md` exactly.

## Steps
1. Find the endpoint's spec in `API_CONTRACTS.md`; find any referenced shapes in
   `DATA_CONTRACTS.md`. If they conflict or are missing, stop and ask.
2. Add/extend the **Pydantic** request + response models in `schemas.py` — field names and
   types verbatim from the contract. Money fields are `int` (paise). Use the project enums.
3. Add the route to the correct file in `routers/`. Require the bearer token (→ `merchant_id`)
   on everything except `/health`. Keep the route thin: validate in, call a service, shape out.
4. Put real logic in `services/` (matching, parsing, insights, Sarvam calls), not the router.
5. Errors → the standard envelope `{"error":{"code","message","detail"}}` with a valid code
   (`unauthorized`, `not_found`, `validation_error`, `stt_failed`, `parse_failed`, `ocr_failed`,
   `tts_failed`, `upstream_timeout`). Never let a Sarvam/exception bubble up as a bare 500.
6. Respect the invariants: `/sales/voice` returns an unconfirmed draft and writes nothing;
   `/sales/confirm` persists + decrements stock + recomputes alerts (with `spoken_message`).
7. After writing, run the `contract-check` skill on this endpoint, then test it with a curl
   or a quick `pytest`/`httpx` call against the running server before moving on.

Prefer extending existing files over inventing new structure. One endpoint per commit.
