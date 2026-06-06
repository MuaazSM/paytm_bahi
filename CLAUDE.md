# Dukaan IQ — Project Memory

One-day Paytm-AI-hackathon MVP. **The item layer for Paytm**: a merchant speaks a
sale in their own language → it's parsed into structured line items → stock decrements
→ proactive insight alerts fire. Monorepo: `backend/` (FastAPI + Sarvam) and
`frontend/` (Expo / React Native).

## Canonical docs — read before building, these are the source of truth
- @PRD.md — scope, goals, non-goals, build plan, demo success criteria
- @API_CONTRACTS.md — every endpoint: method, path, request, response, errors
- @DATA_CONTRACTS.md — DB schema, enums, the LLM JSON contract, seed shape, insight objects
- @DESIGN.md — design tokens, screens, components, the demo choreography

If code and these docs disagree, the docs win. If a doc is silent, ask before inventing.

## Non-negotiable rules (these are the integration seams — break one and the demo breaks)
1. **The contracts are law.** Backend responses and frontend types must match
   `API_CONTRACTS.md` / `DATA_CONTRACTS.md` field-for-field. Never rename a field,
   change a type, or add a required field without updating the contract doc first.
2. **Money is integer paise everywhere** (`unit_price`, `cost_price`, `selling_price`,
   `line_total`, `total_amount`). Only the UI divides by 100 at display time. No floats for money.
3. **Sales are two-step.** `POST /sales/voice` returns an **unconfirmed draft** and
   persists nothing. Only `POST /sales/confirm` writes the sale and decrements stock.
   The frontend must never write to the books without an explicit Confirm tap.
4. **The LLM output is untrusted.** The transcript→items step returns JSON that the
   backend validates against the `ParsedSale` Pydantic model. Never insert raw LLM
   text into the DB; on parse failure, fall back to returning the transcript for manual edit.
5. **Never a dead end on stage.** Every failure path (STT/parse/network) degrades to an
   editable transcript or a retry — never a blank or crashed screen.

## Demo invariants (do not "fix" these — they make the scripted wow moment fire)
- Seed merchant = "Ramesh Kirana Store", language `hi-IN`.
- Parle-G seeded at `current_stock: 4`, `reorder_point: 10` so the live "ek Parle-G"
  sale tips it into a reorder alert. Don't change these numbers.
- `POST /admin/reset` must fully re-seed so the pitch is re-runnable between judge groups.

## Build priority (4.5-hour sprint — build the spine, resist gold-plating)
P0 spine first, end to end: `reset → login → products → sales/voice → sales/confirm →
insights/summary`. Everything else (assistant, OCR, alerts dismiss, inventory CRUD) is
enhancement layered on a working spine. **Out of scope — do not build:** real Paytm OAuth,
voice biometrics, GST/tax, multi-store, staff roles, ML forecasting, real payments.
OCR is a P2 stub with one sample image, not a second hero.

## Conventions
- Timestamps ISO-8601 UTC. Auth = `Authorization: Bearer <STATIC_DEMO_TOKEN>` (mock, one merchant).
- Keep changes small and committed often; one feature per commit.
- Prefer editing existing files over scaffolding new structure mid-sprint.

## Sub-project memory
`backend/CLAUDE.md` and `frontend/CLAUDE.md` hold stack-specific rules and load when you
work in those folders.
