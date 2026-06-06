---
name: contract-check
description: Verify that backend responses or frontend types match API_CONTRACTS.md and DATA_CONTRACTS.md field-for-field. Use when adding or changing an endpoint, wiring an API call, defining a type, or before an integration sync — anytime a data shape crosses the backend/frontend seam.
argument-hint: [endpoint-or-area e.g. /sales/confirm]
disable-model-invocation: true
---

# Contract check

The contracts are the integration seam between backend and frontend. Drift here is the
#1 cause of last-hour hackathon breakage. Check the code under discussion (or the area in
`$ARGUMENTS`) against the canonical docs.

## Steps
1. Read the relevant section of `API_CONTRACTS.md` (endpoint: method, path, request body,
   response body, error codes) and `DATA_CONTRACTS.md` (field types, enums, the `ParsedSale`
   JSON contract, insight object shapes).
2. Compare field-by-field against the implementation:
   - Field **names** match exactly (no `snake_case`↔`camelCase` drift across the wire).
   - Field **types** match — and **money is integer paise**, never float or rupees.
   - Required vs optional/nullable matches the contract.
   - Enum values are exactly the allowed set (`Unit`, `AlertType`, `Severity`, `SaleSource`).
   - Error responses use the envelope `{"error": {"code","message","detail"}}` with a valid code.
3. Check the invariants: `/sales/voice` persists nothing; only `/sales/confirm` writes and
   decrements; alerts include `spoken_message`; `/admin/reset` re-seeds fully.
4. Report a short diff: what matches, what drifts, the exact fix. If the contract itself is
   wrong or silent, say so and propose the doc edit — **do not silently diverge from it.**

Do not change field shapes to make code pass. The contract is the source of truth; align
code to it, or change the contract doc deliberately and flag it for the other dev.
