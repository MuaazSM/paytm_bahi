---
name: design-system
description: Dukaan IQ visual tokens — exact colors, typography, spacing, radii, and the Paytm-blue vs Sarvam-orange rule. Apply when building or styling any React Native screen or component so the app reads as native to the Paytm + Sarvam ecosystem.
paths: frontend/**
---

# Dukaan IQ design tokens

Mirror of `DESIGN.md` §2–3. Use these exact values; don't eyeball colors. Verify against the
official Paytm brand kit before the final build if there's time — these are demo-safe approximations.

## The one rule that tells the story
**Paytm blue = the app / payments world. Sarvam orange = the AI / voice world.** Orange appears
ONLY on AI surfaces (mic FAB while active, "AI" badges, the voice waveform, assistant). Keeping
them visually separate says "Paytm + Sarvam" without a word.

## Colors
```
--paytm-blue        #00BAF2   // primary actions, mic FAB at rest, links
--paytm-blue-dark   #002970   // headers, primary text on light
--paytm-navy        #20336B   // deep accents, selected tab
--paytm-sky-tint    #E6F7FE   // selected/active card backgrounds
--sarvam-accent     #FF6B35   // assistant glow, AI badges, voice waveform (AI surfaces only)
--sarvam-accent-tint#FFF0EA
--bg                #F4F6F9   // app background
--surface           #FFFFFF   // cards
--text-primary      #0A0F2C
--text-secondary    #5B6478
--border            #E4E8EF
--success           #1FA463   // healthy stock, profit
--warning           #F5A623   // running low, wastage risk, low-confidence dot
--danger            #E5484D   // stockout, dead stock
```

## Typography (system default / Inter; Noto Sans Devanagari for Hindi/Marathi)
| token | size/weight | use |
|-------|-------------|-----|
| display | 28/700 | revenue hero number |
| h1 | 22/700 | screen titles |
| h2 | 18/600 | card titles |
| body | 15/400 | content |
| label | 13/500 | captions, units |
| mono-num | 17/600 tabular | money / stock counts |

## Spacing & shape
Spacing scale: 4 / 8 / 12 / 16 / 24 / 32. Card radius 16 · FAB radius full · buttons radius 12.
Tap targets ≥ 48dp.

## Insight = action
Every insight card ends in a verb button (Reorder / Discount / Bundle), not just a number.
Semantic color matches the state (warning amber, danger red, success green, info blue).
