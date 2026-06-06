# Dukaan IQ — Product Requirements Document

> **Working name:** Dukaan IQ (alternatives: *Paytm Sauda*, *Vyapaar Brain*). Swap globally before the pitch.
> **Event:** Paytm AI Hackathon, Mumbai — one-day sprint.
> **Theme:** Theme 2 — AI for Small Businesses.
> **Status:** MVP / hackathon scope. This document is the single source of truth for what we build in the next ~4.5 hours.

---

## 1. One-line summary

Dukaan IQ is the **item layer for Paytm** — the missing data primitive that records *what* a merchant sells (not just how much money came in), captured friction-free by voice in the merchant's own language, and turned into proactive, actionable business intelligence inside the existing Paytm ecosystem.

## 2. Problem statement

Paytm knows **how much money** its merchants make (payments, settlements, Business Khata). It is completely blind to **what they actually sell** at the item level. As a result:

- A merchant cannot see margin, velocity, dead stock, or wastage — the numbers that actually decide whether a thin-margin shop survives.
- Existing inventory apps (Khatabook, Vyapar, Dukaan) capture items but live *outside* the Paytm rail, so they never have the payment ground truth, and they all die on the same rock: **data-entry friction.** Merchants won't type.
- The merchant ends up tracking revenue on one app and inventory on another — two disconnected worlds.

**The gap:** there is no item-level transaction line anywhere in the Paytm merchant stack. Close that gap and you unlock analytics neither Khatabook (no payment data) nor Paytm (no item data) can compute alone.

## 3. Goals & non-goals

### Goals (MVP)
- G1 — Let a merchant log a sale **by voice in an Indian language** and have it parsed into structured line items (`item × qty × price`) in under ~10 seconds.
- G2 — A **confirmation step** before anything is written (trust + error correction).
- G3 — Maintain a live **inventory + sales ledger** that decrements stock on each confirmed sale.
- G4 — Compute and surface **actionable insights**: fast/slow movers, dead stock, reorder/stockout alerts, wastage flags, margin mix.
- G5 — A **voice query assistant** ("aaj kitna becha?", "kya khatam hone wala hai?") answering from the merchant's own data, spoken back via TTS.
- G6 — UI that visually reads as part of the **Paytm + Sarvam** ecosystem.

### Non-goals (explicitly out of scope for the sprint)
- Real Paytm OAuth / real Soundbox firmware integration (mocked; pitched as roadmap).
- Hard voice biometrics / speaker verification (pitched as roadmap — see §9 risk).
- GST/tax compliance, multi-store, staff roles, real payments.
- Production-grade ML demand forecasting (we ship heuristics; ML is the roadmap story).
- OCR is a **secondary stub**, not the hero (voice is the hero).

## 4. Target user

Primary: the kirana/chemist/salon/distributor owner — thin margins, no tech support, already on Paytm, speaks Hindi/Marathi/regional, not English. The capture surface (Soundbox/phone) is already on their counter.

## 5. Core user journeys

### J1 — Onboarding (mocked, ~30s)
Merchant "logs in" (mock) → a starter inventory of ~30 SKUs is pre-seeded (do NOT make the judge watch live entry of 30 items) → lands on the dashboard.

### J2 — Voice sale capture (THE HERO)
Tap mic → speak "do kilo aata aur ek Parle-G, pachpan rupaye" → audio → Saaras STT → Sarvam LLM parses to structured draft line items, fuzzy-matched against the merchant's own catalog → **confirmation card** shown → merchant taps Confirm → sale persists, stock decrements → if a confirmed sale crosses a reorder threshold, a **proactive voice alert** fires: *"That was your last packet of Parle-G — add to reorder list?"*

### J3 — OCR capture (secondary)
Upload a photo of the handwritten day-book → Sarvam Vision → structured draft line items → same confirmation flow.

### J4 — Voice query assistant
Tap assistant → "is hafte sabse zyada kya bika?" → STT → LLM over the merchant's structured data → spoken answer via Bulbul + on-screen card.

### J5 — Insights dashboard
Cards: today's revenue (joins to payment data in the pitch), top movers, dead stock, items running low, wastage risk, margin leaders.

## 6. Functional requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR1 | Record audio in-app and POST to backend | P0 |
| FR2 | Transcribe via Sarvam Saaras (Indian-language + code-mixed) | P0 |
| FR3 | Parse transcript → structured line items via Sarvam LLM, return as **unconfirmed draft** | P0 |
| FR4 | Fuzzy-match parsed item names against merchant catalog (constrained vocabulary) | P0 |
| FR5 | Confirmation step; only confirmed sales are persisted | P0 |
| FR6 | Persist sale + line items; decrement product stock | P0 |
| FR7 | Insights engine: velocity, dead stock, reorder alert, wastage, margin mix, basket pairing | P0 |
| FR8 | Proactive alert generation on stock thresholds | P1 |
| FR9 | Voice query assistant (STT → LLM over data → TTS) | P1 |
| FR10 | TTS playback of confirmations + answers (Bulbul) | P1 |
| FR11 | OCR capture via Sarvam Vision | P2 |
| FR12 | Inventory CRUD (list, add, edit) | P1 |

P0 = demo cannot happen without it. P1 = strongly want for the "wow". P2 = nice-to-have / stub.

## 7. Non-functional requirements
- Voice round-trip (speak → confirmation card) target < 10s on demo Wi-Fi.
- Backend stateless except DB; everything seedable/resettable for repeat demos.
- One-tap "reset demo data" endpoint so you can re-run the pitch cleanly.
- Graceful failure: if STT/LLM errors, show the raw transcript and let the merchant edit — never a dead end on stage.

## 8. Tech stack (MVP — chosen for speed of build, not scale)

### Frontend — React Native
- **Expo (SDK 52+) + TypeScript** — fastest path; run on a real phone via Expo Go, no native build toolchain needed during the sprint.
- **expo-av / expo-audio** — microphone recording (m4a/wav).
- **NativeWind v4** (Tailwind for RN) — fast styling, easy to hit the Paytm palette; see DESIGN.md tokens.
- **React Navigation** (native-stack + bottom-tabs).
- **Zustand** — minimal global state (merchant, draft sale, inventory cache).
- **Axios** — API client.
- **expo-image-picker** — OCR photo upload (P2).

### Backend — FastAPI
- **Python 3.11+, FastAPI, Uvicorn**.
- **Pydantic v2** — request/response validation; contracts in API_CONTRACTS.md.
- **SQLModel** (SQLAlchemy + Pydantic) over **SQLite** — zero-setup, file-based DB. Single `dukaaniq.db` file; trivial to reset. (Postgres is the scale story, not the sprint.)
- **httpx** — async calls to Sarvam.
- **python-multipart** — audio/image uploads.
- **rapidfuzz** — fuzzy matching of parsed item names to the catalog.

### AI — Sarvam (uses your free credits; plays to Sarvam's Indian-language edge)
- **STT:** Saaras v3 (`transcribe` mode) — handles code-mixed Hindi-English shop speech.
- **Parsing + Q&A:** Sarvam-30B via chat completions — transcript → strict JSON line items; and answering data questions.
- **TTS:** Bulbul v3 — spoken confirmations and assistant answers.
- **OCR:** Sarvam Vision / Document Intelligence — handwritten/printed day-book → structured text. (P2 stub.)
- Accessed via the `sarvamai` Python SDK from the backend only (never ship keys to the app).

### Auth (mock)
- Single seeded demo merchant; static bearer token in the app. No real OAuth. Pitched as "in production this is your existing Paytm login."

### Hosting / demo
- Backend runs locally; expose via **cloudflared** or **ngrok** tunnel so the phone (Expo Go) can reach it. Put the tunnel URL in the app's `.env`.

## 9. Key risks & mitigations

| Risk | Mitigation |
|------|------------|
| Voice biometrics ("only merchant's voice") is hard + fragile live | **Cut it from the demo.** Auth = the logged-in device/account. Keep the Siri-style confirmation as the trust mechanism. Pitch voice-ID as roadmap. |
| STT misfires in a noisy room | Match against the merchant's **finite catalog** (constrained vocab, not open) — far more accurate. Always show editable transcript + draft before persisting. |
| LLM returns malformed JSON | Use strict "JSON only, no prose" system prompt + server-side validation; on parse failure, fall back to showing transcript for manual edit. |
| Sarvam latency/credits during demo | Pre-warm calls; cache TTS for stock phrases; have a recorded fallback clip of the hero loop. |
| Trying to build voice + OCR fully | Voice is P0 hero; OCR is a P2 stub with one pre-loaded sample image. |
| Live-entering inventory eats demo time | Pre-seed 30 SKUs. Only enter 1–2 items live for drama. |

## 10. Architecture

### 10.1 High-level

```
┌──────────────────────────────┐
│  React Native app (Expo)     │
│  - Mic capture / image pick  │
│  - Confirmation UI           │
│  - Insights dashboard        │
│  - Voice assistant           │
└──────────────┬───────────────┘
               │ HTTPS (REST + multipart)
               ▼
┌──────────────────────────────┐
│  FastAPI backend             │
│  ┌────────────────────────┐  │
│  │ Routers                │  │  /auth /products /sales
│  │                        │  │  /insights /assistant
│  ├────────────────────────┤  │
│  │ Services               │  │
│  │  - SpeechService (STT) │──┼──► Sarvam Saaras
│  │  - ParseService (LLM)  │──┼──► Sarvam-30B
│  │  - VoiceService (TTS)  │──┼──► Sarvam Bulbul
│  │  - OcrService          │──┼──► Sarvam Vision
│  │  - MatchService (fuzzy)│  │
│  │  - InsightsService     │  │
│  ├────────────────────────┤  │
│  │ SQLModel ORM           │  │
│  └───────────┬────────────┘  │
└──────────────┼───────────────┘
               ▼
        ┌─────────────┐
        │  SQLite DB  │  merchants, products, sales,
        │             │  sale_line_items, alerts
        └─────────────┘
```

### 10.2 The voice-capture pipeline (the heart of the product)

```
audio ─► [SpeechService → Saaras STT] ─► transcript
       ─► [ParseService → Sarvam-30B]  ─► raw line items (name, qty, unit, price)
       ─► [MatchService → rapidfuzz]    ─► resolved to catalog product_ids + low-confidence flags
       ─► return UNCONFIRMED draft to client
                         │
          (merchant taps Confirm)
                         ▼
       ─► persist Sale + SaleLineItems, decrement stock
       ─► [InsightsService] re-evaluate thresholds ─► emit alerts
       ─► [VoiceService → Bulbul TTS] ─► spoken confirmation / alert
```

**Two-step by design:** parse returns a *draft* (`/sales/voice`); persistence happens only on `/sales/confirm`. This is both the trust story and a clean place to correct STT errors.

### 10.3 Insights engine (heuristics, computed on-demand)

No ML needed for the MVP. Per-SKU over a rolling window:

- **Velocity** = units sold ÷ days observed → rank fast vs slow movers.
- **Dead stock** = days since last sale > threshold.
- **Reorder/stockout** = reorder point (`avg_daily_demand × lead_time`) crossed → alert.
- **Wastage risk** = `is_perishable` AND declining sell-through.
- **Margin mix** = `(selling_price − cost_price) × units` → profit leaders vs revenue leaders.
- **Basket pairing** = co-occurrence count of products within the same sale.

Computed at query time (`/insights/summary`, `/insights/alerts`) — simplest for the sprint. The *forecasting* version is the roadmap slide.

### 10.4 Data flow boundaries
- Sarvam keys live only on the backend. The app never talks to Sarvam directly.
- The LLM ↔ backend boundary is a **strict JSON contract** (see DATA_CONTRACTS.md §"ParsedLineItem"). The backend validates; it never trusts free-form LLM text into the DB.

## 11. Build plan (4.5 hours)

| Time | Work |
|------|------|
| 0:00–0:30 | Repo scaffold (FastAPI + Expo). Seed 30-SKU inventory. Reset endpoint. |
| 0:30–2:00 | Voice pipeline P0: record → Saaras → Sarvam-30B parse → fuzzy match → draft → confirm → persist + decrement. |
| 2:00–3:00 | Insights engine + alerts. Dashboard cards. |
| 3:00–4:00 | Voice query assistant (STT→LLM→Bulbul) + polish dashboard. |
| 4:00–4:30 | OCR stub, demo data reset, **rehearse the hero loop twice.** |
| Buffer | Recorded fallback of the hero loop in case Wi-Fi/credits fail. |

## 12. Success criteria (demo)
- The hero loop runs end-to-end, live, in Hindi, in under ~10s, with a proactive alert firing.
- One voice query answered out loud from real seeded data.
- Dashboard shows at least 4 distinct insight types populated from seeded + live data.
- Pitch ties it to the moat: payments-truth + item-truth = analytics only Paytm can own.

## 13. Companion documents
- **DATA_CONTRACTS.md** — DB schema, enums, the LLM JSON contract, seed shape, insight/alert objects.
- **API_CONTRACTS.md** — every endpoint: method, path, request, response, errors.
- **DESIGN.md** — design tokens, screen inventory, components, the demo-moment UI, regional UX.
