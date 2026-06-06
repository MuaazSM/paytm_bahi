---
name: new-screen
description: Scaffold a React Native / Expo screen for Dukaan IQ — component, navigation entry, Zustand wiring, and contract-typed API calls — styled with the project design tokens. Use when building or implementing a frontend screen.
argument-hint: [screen name e.g. Confirm]
disable-model-invocation: true
---

# New screen

Build the screen named in `$ARGUMENTS` per its spec in `DESIGN.md` (§4 inventory, §5 specs,
§6 components) and the data shapes in `API_CONTRACTS.md`.

## Steps
1. Read the screen's spec in `DESIGN.md` and the endpoint(s) it touches in `API_CONTRACTS.md`.
2. Create the screen under `src/screens/`, register it in `navigation/` (tab or modal as the
   spec says; capture/confirm are modals over the tabs).
3. Use the `design-system` skill's tokens for every color/size/spacing — Paytm blue for
   app/payment surfaces, Sarvam orange ONLY for AI/voice surfaces. Card radius 16, FAB full,
   buttons 12. Tap targets ≥ 48dp.
4. Data: consume the typed wrappers in `api/client.ts` and types from `api/types.ts` (which
   mirror the contract). Read/write shared state via the Zustand store, not prop-drilling.
5. Build the **non-happy states** the spec calls for: loading (skeleton/waveform), empty,
   error (transcript + manual edit / retry toast), and low-confidence (amber dot, tap-to-fix).
   Never render a blank dead end.
6. Labels bilingual (Hindi/regional + English caption); money via the `LangNumber`/paise→₹
   helper (divide by 100 only at display).
7. While the backend endpoint isn't live yet, back the call with a fixture shaped exactly
   like the contract response so switching to the real URL is a one-liner.

Reuse existing components (`MicFAB`, `LineItemRow`, `InsightCard`, `AlertPill`, `StockBadge`)
before writing new ones. One screen per commit.
