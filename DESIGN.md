# Dukaan IQ — DESIGN.md

Visual + interaction spec for the React Native app. Goal: it should feel like a native part of the **Paytm** ecosystem with a **Sarvam**-powered intelligence layer. Built with Expo + NativeWind (Tailwind tokens below).

> Brand hexes are close approximations to Paytm's palette — verify against the official Paytm brand kit / app before the final build if you have a minute, but these are demo-safe.

---

## 1. Design principles
1. **Paytm-familiar, instantly.** Reuse Paytm's blue, card-on-light-grey layout, and bottom-tab pattern so judges read it as "inside Paytm."
2. **Voice-first, thumb-second.** The mic is the primary action and lives as a persistent FAB. The merchant's hands are busy; tapping is the fallback.
3. **Confirm before commit.** Nothing hits the books without a glanceable confirmation card. This is the trust mechanic, not friction.
4. **Speak the user's language.** Every label has a Hindi/regional string; numbers shown in both Latin and Devanagari numerals where it helps.
5. **Insight = action, not a chart.** Every insight card ends in a verb ("Reorder", "Discount", "Bundle"), not just a number.

---

## 2. Color tokens

```
// Paytm-family
--paytm-blue        #00BAF2   // primary actions, mic FAB, links
--paytm-blue-dark   #002970   // headers, primary text on light
--paytm-navy        #20336B   // deep accents, selected tab
--paytm-sky-tint    #E6F7FE   // selected/active card backgrounds

// Sarvam-family (intelligence accent — used ONLY on AI surfaces)
--sarvam-accent     #FF6B35   // assistant glow, "AI" badges, voice waveform
--sarvam-accent-tint#FFF0EA

// Neutrals / surfaces
--bg                #F4F6F9   // app background (light grey, Paytm-like)
--surface           #FFFFFF   // cards
--text-primary      #0A0F2C
--text-secondary    #5B6478
--border            #E4E8EF

// Semantic
--success           #1FA463   // healthy stock, profit
--warning           #F5A623   // running low, wastage risk
--danger            #E5484D   // stockout, dead stock
```

Rule of thumb: **Paytm blue = the app/payments world. Sarvam orange = the AI/voice world.** Keeping them visually distinct tells the story ("Paytm + Sarvam") without a word.

---

## 3. Typography
- Family: system default (SF Pro / Roboto) for native feel; or **Inter** via expo-font for consistency.
- Devanagari: ensure a font with good Devanagari coverage (Noto Sans Devanagari) for Hindi/Marathi labels.

| token | size / weight | use |
|-------|---------------|-----|
| display | 28 / 700 | revenue hero number |
| h1 | 22 / 700 | screen titles |
| h2 | 18 / 600 | card titles |
| body | 15 / 400 | content |
| label | 13 / 500 | captions, units |
| mono-num | 17 / 600 tabular | money / stock counts |

Spacing scale: 4 / 8 / 12 / 16 / 24 / 32. Card radius 16, FAB radius full, buttons radius 12.

---

## 4. Navigation & screen inventory

Bottom tab bar (4 tabs) + a persistent mic FAB centered on the bar.

```
[ Home ]   [ Inventory ]   (🎤 FAB)   [ Insights ]   [ Assistant ]
```

| # | Screen | Purpose | Priority |
|---|--------|---------|----------|
| S1 | Home / Dashboard | revenue today, top alerts, quick insight cards | P0 |
| S2 | Voice Capture (modal) | record → live transcript → draft confirmation | P0 |
| S3 | Confirmation Card (modal) | editable parsed line items + Confirm | P0 |
| S4 | Inventory | searchable SKU list, stock badges, add/edit | P1 |
| S5 | Insights | full insight breakdown (movers, dead stock, margin, pairings) | P0 |
| S6 | Assistant | voice/text Q&A with spoken answers | P1 |
| S7 | OCR Capture (modal) | photo upload → draft (stub) | P2 |
| S8 | Onboarding (mock) | login → seeded inventory | P0 |

---

## 5. Key screen specs

### S1 — Home / Dashboard
- Top: greeting + business name. Hero card: **"Aaj ki bikri"** revenue (display token), with a small "+ ₹X vs yesterday" delta.
- **Alert strip** (if any): horizontally scrollable orange/red pills — "Parle-G low", "Milk wastage risk". Tapping a pill → relevant action.
- Grid of 2-up insight cards (see component §6.3): Top mover, Running low, Margin leader, Dead stock. Each card ends in an action button.
- Persistent mic FAB.

### S2 — Voice Capture (the hero)
- Full-bleed modal. Big circular mic with a **Sarvam-orange animated waveform** while recording.
- Live state labels: `Sun raha hoon…` (listening) → `Samajh raha hoon…` (parsing, with the Sarvam glow).
- On result → slide up the Confirmation Card (S3). On error → show transcript text with an "Edit manually" affordance (never a dead end).

### S3 — Confirmation Card (trust moment)
- Title: "Yeh sahi hai?" (Is this right?)
- One row per line item: `qty · unit · name ……… ₹line_total`, each editable (tap to adjust qty/price). Low-confidence matches (`<0.7`) show an amber dot + are tappable to reassign to the right SKU.
- Footer: bold total + two buttons — **Confirm** (paytm-blue, primary) and **Cancel**.
- On Confirm → success check animation → if an alert fired, a small toast + spoken alert plays.

### S5 — Insights
- Sectioned list: **Tej bikne wale** (top movers, with bars), **Khatam hone wale** (running low), **Munafa** (margin leaders), **Pada hua maal** (dead stock), **Saath bikte hain** (pairings). Each item row carries an action.
- A subtle "Powered by Sarvam" mark on this screen reinforces the AI partnership.

### S6 — Assistant
- Chat-style screen, but voice-forward: big mic to ask. Question bubble (transcribed) + answer bubble that also auto-plays Bulbul audio, with a small replay button. Answer bubble can embed a mini insight card from the `data` field.

---

## 6. Component library

### 6.1 `MicFAB`
Center-docked floating button, paytm-blue at rest. While recording, swaps to Sarvam-orange with pulsing waveform. Single tap = start/stop.

### 6.2 `LineItemRow`
`{qty} {unit} · {name}` left, `₹{total}` right. Editable. Amber confidence dot when `match_confidence < 0.7`.

### 6.3 `InsightCard`
- Icon (semantic color) · title · the number · one-line plain-language takeaway · **action button**.
- Examples:
  - *Running low* (warning): "Parle-G — 3 left" → **[Reorder]**
  - *Dead stock* (danger): "Hair Gel — no sale in 26 days" → **[Discount]**
  - *Pairing* (info): "Bread + Butter sold together 12×" → **[Bundle]**

### 6.4 `AlertPill`
Compact rounded pill, semantic color, used in the Home alert strip. Speaks its `spoken_message` on tap.

### 6.5 `StockBadge`
Green / amber / red dot + count, based on `current_stock` vs `reorder_point`.

### 6.6 `LangNumber`
Renders a number with optional Devanagari numerals based on merchant language.

---

## 7. The demo-moment choreography (UI script)

This is the 10-second loop the whole pitch hinges on — design every transition to make it feel instant and magical:

1. Tap mic FAB → modal opens, **orange waveform** dances, label "Sun raha hoon…".
2. Merchant: *"ek Parle-G aur do kilo aata."*
3. Waveform → "Samajh raha hoon…" (Sarvam glow ~1–2s).
4. Confirmation card slides up, pre-filled: `1 packet · Parle-G — ₹10`, `2 kg · Aashirvaad Atta — ₹110`. Total ₹120.
5. Tap **Confirm** → green check.
6. Stock for Parle-G drops 4 → 3. A **red AlertPill** animates into the Home strip, and Bulbul speaks: *"Parle-G sirf teen packet bacha hai — dobara order karein?"*
7. Presenter: "Paytm just learned what he sold — and told him what to do about it. In his language. On the device already on his counter."

Pre-seed so step 6 always triggers (Parle-G stock 4, reorder point 10).

---

## 8. States to design (don't skip — they show polish)
- **Loading:** skeleton cards on Home; waveform/parsing states on capture.
- **Empty:** Inventory empty → "Add your first item" (won't happen in demo, but build it).
- **Error:** STT/parse fail → show transcript + manual edit. Network fail → retry toast. Never a blank dead end on stage.
- **Low-confidence match:** amber dot + tap-to-correct on the confirmation card.

---

## 9. Regional / accessibility UX (ties to Theme 1 & the Sarvam story)
- All primary labels bilingual (Hindi/regional + English caption).
- Large tap targets (≥48dp) — merchant may have wet/busy hands.
- Voice is a first-class input everywhere a list exists (search inventory by voice too, if time).
- High-contrast semantic colors readable in bright shop lighting.
- TTS answers default to the merchant's onboarding language.

---

## 10. Asset checklist for the sprint
- App icon + simple wordmark (placeholder fine).
- "Powered by Sarvam" lockup on AI surfaces.
- Mic FAB waveform animation (lottie or a simple animated SVG/RN Animated loop).
- ~3 semantic icons (warning, danger, profit) — use lucide-react-native.
- One sample handwritten day-book photo for the OCR stub.

> Keep visual scope tight: nail S1 (Home), S2/S3 (the hero capture+confirm), and S5 (Insights). Those three carry the entire demo. Everything else is supporting cast.
