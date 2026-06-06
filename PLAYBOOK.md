# Dukaan IQ — Claude Code Playbook

A field guide for the two of you to build the MVP fast and *parallel* without colliding.
**You = backend (FastAPI + Sarvam). Teammate = frontend (Expo / React Native).**
The contracts are the seam between you; this playbook keeps that seam tight.

How to use it: do the one-time **Setup** together, agree the **Working agreement**, then each
of you works your own **track** phase by phase. Prompts are copy-paste-ready for Claude Code.

---

## 0. One-time setup (do this together, ~10 min)

1. **Install Claude Code** (needs Node.js 18+):
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```
2. **Drop the memory + skills into the repo** (from this bundle):
   ```
   repo/
     CLAUDE.md                      # root constitution (loads in every session)
     backend/CLAUDE.md              # loads when you work in backend/
     frontend/CLAUDE.md             # loads when teammate works in frontend/
     .claude/skills/                # contract-check, new-endpoint, new-screen, design-system, seed-demo
     PRD.md  API_CONTRACTS.md  DATA_CONTRACTS.md  DESIGN.md   # keep these at repo root
   ```
   `.claude/skills/` is committed, so you both get the same skills. Skill edits are picked up
   live mid-session; a brand-new top-level skills dir needs a restart.
3. **Install the official Sarvam skills (backend — high leverage):** Sarvam publishes
   Claude-compatible skills that are *correction layers* for the exact `sarvamai` SDK calls
   models tend to hallucinate (chat has no `.create()`, Bulbul v3 rejects pitch/loudness, etc.):
   ```bash
   npx skills add sarvamai/skills            # all of them, or:
   npx skills add sarvamai/skills --skill chat
   npx skills add sarvamai/skills --skill stt
   npx skills add sarvamai/skills --skill tts
   ```
   Verify the source before trusting it, then let them auto-load when you write Sarvam code.
4. **Sanity check:** run `claude` in the repo, then ask `What skills are available?` — you
   should see the project skills (and, in backend, the Sarvam ones). Run `/doctor` if any are missing.
5. **Record how to launch the app** so `/run` and `/verify` work without re-explaining:
   in each folder run `/run-skill-generator` once. It captures the install + launch recipe
   (uvicorn for backend; `expo start` + tunnel for frontend) as a per-project skill.

---

## 1. The skills strategy (what to use and why)

Skills load on demand, so they cost almost nothing until used — that's why they beat stuffing
everything into CLAUDE.md.

**Project skills (in this bundle, committed):**
- `contract-check` — *the drift guard.* Run before any data shape crosses the seam. Manual-only
  (`/contract-check /sales/confirm`) so it fires when you decide, not at random.
- `new-endpoint` (backend) / `new-screen` (frontend) — task scaffolders that bake in the project
  patterns and the contract, so generated code lands consistent. Invoke with `/new-endpoint POST /sales/voice`.
- `design-system` (frontend) — reference tokens, auto-loads on `frontend/**` files so every
  component uses the exact Paytm-blue / Sarvam-orange palette without you re-pasting hexes.
- `seed-demo` (backend) — generates/repairs the seed and *verifies the Parle-G alert fires.*

**Bundled skills you already have (no install):**
- `/run`, `/verify` — launch the app and confirm a change works against the running app, not just
  a passing test. Great for "does the voice round-trip actually work end to end."
- `/code-review` — sweep a diff before committing.
- `/debug` — structured help when STT/parse/CORS misbehaves.
- `/run-skill-generator` — (from setup) teaches `/run` your launch recipe.

**Want more?** The `skill-creator` plugin (`claude.com/plugins/skill-creator`) builds new skills
interactively — only worth it mid-sprint if you catch yourself re-explaining the same procedure.

**Rule of thumb:** if you paste the same instructions 3× → make it a skill. If it's a fact that's
always true → it's already in CLAUDE.md. If it changes hourly → keep it in the prompt.

---

## 2. Working agreement (read once, both of you)

- **The contract is law.** Neither side changes a field name/type without editing
  `API_CONTRACTS.md` / `DATA_CONTRACTS.md` first and pinging the other. Run `/contract-check`
  before you push anything that touches the wire.
- **Build the P0 spine first, in order:** `reset → login → products → sales/voice →
  sales/confirm → insights/summary`. Resist everything else until that runs end to end.
- **Frontend never waits on backend.** Mock against the contract fixtures; the tunnel URL is a
  one-line swap. Sync at the phase boundaries below.
- **Session hygiene:** `/clear` between unrelated tasks (keeps context sharp). Use **plan mode**
  for anything touching multiple files — review the plan before it writes. Commit one feature at a time.
- **Sync points:** end of Phase 1 (voice loop), end of Phase 2 (insights). At each, frontend
  points at the live tunnel URL and you both run the hero loop once.

---

## 3. Backend track — prompts for YOU

> Run `claude` inside `backend/`. Keep the Sarvam API key in `backend/.env` as `SARVAM_API_KEY`.

### Phase 0 (0:00–0:30) — Scaffold + DB + seed + reset
```
Scaffold the FastAPI backend per backend/CLAUDE.md and the contracts. Create main.py
(app + CORS for Expo + static /audio mount), db.py (SQLite engine + session dep +
create_all on startup), models.py (the exact SQLModel schema from DATA_CONTRACTS.md §2),
schemas.py (Pydantic models matching API_CONTRACTS.md), and empty router files for
auth, products, sales, insights, assistant, admin. Then implement GET /health,
POST /admin/reset, POST /auth/login, GET /products exactly per the contract. Use plan
mode and show me the plan first.
```
```
/seed-demo rebuild
```
```
/run        # confirm uvicorn boots, /health is 200, /products returns the 30 seeded SKUs
```

### Phase 1 (0:30–2:00) — The voice pipeline (the spine)
```
/new-endpoint POST /sales/voice
```
> When it builds the parse step, lean on the Sarvam `stt` and `chat` skills. Send the
> canonical system prompt from DATA_CONTRACTS.md §3.2, strip stray fences, json.loads,
> validate against the ParsedSale model, and on failure return the transcript with
> parse_failed — never a bare 500.
```
Now implement services/match.py: the deterministic post-LLM resolution from
DATA_CONTRACTS.md §3.3 using rapidfuzz over each product's name + aliases — best
product_id + match_confidence, fill missing price from selling_price, handle
price_is_total, compute line_total, flag confidence < 0.7. No LLM in this file.
```
```
/new-endpoint POST /sales/confirm
```
```
/contract-check /sales/confirm     # then:
/verify                            # run the real round-trip: post audio → draft → confirm → stock drops, alert fires
```

### Phase 2 (2:00–3:00) — Insights engine + alerts
```
Implement services/insights.py and GET /insights/summary returning the exact object in
DATA_CONTRACTS.md §5: revenue_today/week, top_movers, dead_stock, running_low,
wastage_risk, margin_leaders, pairings. Use the heuristics in PRD §10.3, computed on
demand from confirmed sales only. Then GET /insights/alerts and the dismiss endpoint.
```
```
/contract-check /insights/summary
/seed-demo verify     # confirm all six sections come back non-empty
```

### Phase 3 (3:00–4:00) — Voice assistant + TTS
```
/new-endpoint POST /assistant/query
```
> Pipeline: STT (if audio) → build a compact JSON of the merchant's insight data → Sarvam
> chat answers from THAT data only → Bulbul TTS to a wav under /audio. Use the Sarvam `tts`
> skill for the convert call. Also add POST /assistant/speak and GET /audio/{file}.
```
/code-review     # review the whole diff before the freeze
```

### Phase 4 (4:00–4:30) — OCR stub + harden
```
Add POST /sales/ocr as a P2 stub: accept an image, run Sarvam Vision to text, feed that
text through the SAME ParsedSale contract as /sales/voice, return the same draft shape
with source=ocr. Then make sure /admin/reset fully restores the demo and /seed-demo
verify passes. Keep it minimal — this is a stub, not a second hero.
```

---

## 4. Frontend track — prompts for your TEAMMATE

> Run `claude` inside `frontend/`. Put `EXPO_PUBLIC_API_URL` in `frontend/.env`
> (mock value until backend's tunnel is live).

### Phase 0 (0:00–0:30) — Scaffold + theme + API client + nav
```
Scaffold the Expo + TypeScript app per frontend/CLAUDE.md. Set up NativeWind v4 with the
design-system tokens, React Navigation (bottom tabs + a center mic FAB, plus a modal stack
for capture/confirm), a Zustand store (merchant, draftSale, inventory, alerts), and
src/api/client.ts + src/api/types.ts where the types mirror API_CONTRACTS.md exactly.
Back the client with contract-shaped fixtures for now. Plan mode first.
```
```
/run     # confirm the app opens in Expo Go with empty tab shells
```

### Phase 1 (0:30–2:00) — Home + the hero capture/confirm loop
```
/new-screen Home
```
> Hero "Aaj ki bikri" revenue card, alert strip, 2-up insight cards. Use fixtures matching
> /insights/summary so it looks alive immediately.
```
/new-screen VoiceCapture
```
> Full-bleed modal, big mic with a Sarvam-orange animated waveform, states "Sun raha hoon…"
> → "Samajh raha hoon…". On result slide up the Confirm card; on error show the transcript
> with Edit manually. Record audio with expo-av and POST to /sales/voice.
```
/new-screen Confirm
```
> The trust moment: editable LineItemRows (qty/price/SKU reassign), amber dot for
> match_confidence < 0.7, bold total, Confirm (paytm-blue) + Cancel. Confirm is the ONLY
> caller of /sales/confirm; on success play the alert's spoken_message.
```
/contract-check /sales/voice     # make sure the request/response types match the backend
```
*(Sync point: backend's voice loop is live — swap EXPO_PUBLIC_API_URL to the tunnel and run the loop once.)*

### Phase 2 (2:00–3:00) — Insights screen
```
/new-screen Insights
```
> Sectioned list per DESIGN.md §5: Tej bikne wale (bars), Khatam hone wale, Munafa,
> Pada hua maal, Saath bikte hain. Every row ends in an action button. Wire to the live
> GET /insights/summary. Build loading + empty states.
```
/verify     # confirm the dashboard renders real data from the running backend
```

### Phase 3 (3:00–4:00) — Assistant + polish
```
/new-screen Assistant
```
> Voice-forward chat: big mic to ask → question bubble (transcribed) + answer bubble that
> auto-plays the Bulbul audio from answer_audio_url, with a replay button and an embedded
> mini insight card from the `data` field. Calls POST /assistant/query.
```
Polish pass: skeleton loaders on Home/Insights, success check animation on Confirm,
the AlertPill animating into the Home strip. Tighten every transition in the §7 hero
choreography so it feels instant. Don't add new screens.
```
```
/code-review
```

### Phase 4 (4:00–4:30) — OCR stub + rehearse
```
/new-screen OcrCapture
```
> P2 stub: expo-image-picker → POST /sales/ocr → reuse the SAME Confirm card. Ship one
> pre-loaded sample day-book image. Minimal.

---

## 5. When it breaks on the clock — fast recovery

- **Types mismatch / 422s across the wire** → `/contract-check <endpoint>` on both sides;
  align code to the doc, don't reshape in components.
- **Sarvam call signature errors** → trust the Sarvam `chat`/`stt`/`tts` skills and the
  installed package over any remembered snippet; `/debug` with the traceback.
- **Insights come back empty** → `/seed-demo verify`; the history seed or the confirmed-only
  filter is the usual culprit.
- **Parle-G alert won't fire in rehearsal** → the seed stock/reorder numbers drifted from
  4/10; `/seed-demo rebuild`.
- **Phone can't reach backend** → CORS/origin or the tunnel URL; check `EXPO_PUBLIC_API_URL`
  and that cloudflared/ngrok is up. `/debug`.
- **Context feels muddy / Claude ignoring rules** → `/clear` and restate the one task; the
  CLAUDE.md and skills reload fresh.

Keep the recorded fallback clip of the hero loop ready (PRD §11 buffer) in case Wi-Fi or
Sarvam credits die mid-pitch.
