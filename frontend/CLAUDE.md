# Frontend — Dukaan IQ (Expo / React Native)

Read root `CLAUDE.md` first — its rules apply. This file adds frontend specifics.
The `design-system` skill carries the exact tokens; this file carries the behaviour rules.

## Stack
Expo SDK 52+ · TypeScript · NativeWind v4 (Tailwind for RN) · React Navigation
(native-stack + bottom-tabs) · Zustand for global state · Axios for the API client ·
expo-av/expo-audio for mic capture · expo-image-picker for OCR (P2) · lucide-react-native icons.

## Layout
```
frontend/
  App.tsx
  src/
    api/client.ts        # axios instance: baseURL from env, bearer token, typed wrappers per API_CONTRACTS.md
    api/types.ts         # TS types generated FROM the contracts — single source for shapes
    store/               # Zustand: merchant, draftSale, inventory cache, alerts
    navigation/          # bottom tabs + the mic FAB; modal stack for capture/confirm
    screens/             # Home, VoiceCapture, Confirm, Inventory, Insights, Assistant, Onboarding
    components/          # MicFAB, LineItemRow, InsightCard, AlertPill, StockBadge, LangNumber
    theme/               # NativeWind config + tokens (mirror DESIGN.md / design-system skill)
```

## Behaviour rules (these carry the demo)
1. **Contract-typed API only.** `api/types.ts` mirrors API_CONTRACTS.md exactly; screens
   consume those types. If a shape is wrong, fix the type to match the contract, don't
   reshape data ad hoc in a component.
2. **Confirm before commit.** The Confirmation Card (S3) is the only path that calls
   `/sales/confirm`. Line items stay editable (qty/price/SKU reassign) until Confirm.
   Low-confidence matches (`match_confidence < 0.7`) show an amber dot and are tappable.
3. **Never a dead end.** STT/parse error → show the transcript with "Edit manually".
   Network error → retry toast. Build the loading / empty / error / low-confidence states.
4. **Mock against the contract while backend catches up.** Put `EXPO_PUBLIC_API_URL` in
   `.env`; until it's live, back the client with fixtures shaped exactly like the contract
   responses, so swapping to the real tunnel URL is a one-line change.
5. **Bilingual + thumb-friendly.** Primary labels Hindi/regional + English caption.
   Tap targets ≥ 48dp. High-contrast semantic colors (shop lighting).

## Design language
Paytm blue = the app/payments world; Sarvam orange = the AI/voice world. Use orange ONLY
on AI surfaces (mic FAB while active, "AI" badges, waveform, assistant). Exact hexes,
type scale, spacing, and radii live in the `design-system` skill — use those tokens, don't
eyeball colors. Card radius 16, FAB radius full, buttons radius 12.

## Focus order (visual scope is tight — nail these three, everything else is supporting cast)
S1 Home → S2 Voice Capture → S3 Confirm → S5 Insights. The 10-second hero loop in
DESIGN.md §7 is the thing the whole pitch hinges on; make every transition feel instant.

## Don't
No browser storage APIs. No heavy animation libs if a simple Animated loop will do.
Don't build screens outside the inventory of DESIGN.md §4 during the sprint.
