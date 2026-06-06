---
name: seed-demo
description: Generate or repair the Dukaan IQ demo seed — the Ramesh Kirana merchant, ~30 SKUs with rich aliases, and ~14 days of history — and verify the scripted Parle-G reorder trigger still fires. Use when building seed.py, fixing empty insights, or before a demo run.
argument-hint: [optional: verify | rebuild]
disable-model-invocation: true
---

# Seed the demo

Produce/maintain `seed.py` per `DATA_CONTRACTS.md` §6 so the demo always has rich data and
the scripted wow moment always fires.

## Requirements
1. Merchant: "Ramesh Kirana Store", phone `9800000000`, language `hi-IN`, type `kirana`.
2. ~30 products with **rich `aliases`** (this is what makes constrained-vocab voice matching
   work — e.g. Parle-G → `["parle","parle g","biscuit","biskut"]`). Mix perishable
   (milk, bread, paneer) and non-perishable. Money in paise.
3. **Demo invariant:** Parle-G `current_stock: 4`, `reorder_point: 10` so a live "ek Parle-G"
   sale tips it to 3 and fires a reorder alert. Do not change these.
4. ~14 days of historical confirmed sales so `/insights/summary` returns non-empty
   top_movers / dead_stock / running_low / wastage_risk / margin_leaders / pairings on first load.
   Spread sales so at least one item reads as dead stock and one as a clear margin leader.
5. `/admin/reset` calls this to wipe sales+alerts and restore products to seed stock.

## Verify (run after building, and before each demo)
- Reset, then GET `/insights/summary` → all six insight sections non-empty.
- POST a confirmed `ek Parle-G` sale → Parle-G stock 4→3 and a `reorder` alert with a
  Hindi `spoken_message` is returned. If it doesn't fire, the seed numbers drifted — fix them.
