# PR: Real-Time Pricing (NM/EX/VG) + Hover Condition Bar

## Summary
- Fetches live USD pricing from Scryfall per card and derives condition prices using multipliers (NM=1.00, EX=0.85, VG=0.75).
- Shows pricing only when the user hovers a card (selection behavior via hover).
- Integrates real-time prices into the three condition buttons (NM/EX/VG) and removes the former “G” condition.
- Colors each condition price based on last-seen comparison per browser (green if higher, red if lower).
- Keeps cart behavior consistent: adding the active condition uses the correct live price.

## Files Changed
- `fetchCardImages.js`: add pricing fetch, condition multipliers, NM/EX/VG only, hover-only buttons, price trend coloring.
- `README.md`: document hover-only pricing, three conditions, multipliers, and local behavior.
- `docs/ROADMAP.md`: roadmap and sprint suggestion (added earlier in this branch).
- `CONTRIBUTING.md`: contribution and workflow guide (added earlier in this branch).

## Acceptance Criteria
- When hovering any card, a condition bar appears with three buttons: NM, EX, VG.
- Each button shows live price text (e.g., `EX (6) — $12.34`).
- Prices use Scryfall `prices.usd` (fall back to `usd_foil`/`usd_etched` if needed); derived using multipliers.
- Prices appear green if higher than last time seen on this browser, red if lower; unchanged prices stay default.
- Double-clicking the image or pressing “Add to Cart” adds the active condition’s live price to the cart.

## How to Test
1. Run locally with Live Server or `npx http-server -p 5173` and open `http://localhost:5173`.
2. Hover a card: the condition bar appears with NM/EX/VG and prices.
3. Click different condition buttons to animate the stack and update the displayed price.
4. Refresh the page to simulate “last seen” persistence; price spans should color green/red if prices have changed.

## Notes
- LocalStorage is used per card name + condition to compare last-seen prices.
- We treat hover as “selection”; can switch to sticky click-to-select if desired later (esp. for mobile).
- If Scryfall offers no price, UI shows `$0.00` and no color delta.
