# PR: Daily Spin (Engagement)

## Summary
- Adds a brand-styled “Daily Spin” modal with a 4-segment wheel (Store Credit, Free Shipping, CB Points, Free Card).
- Gated to once per day per browser for logged-in users; manual trigger via header button.
- Results are stored in a simple local ledger for future integration.

## Files Changed
- `index.html`: Modal markup and styles; header `Daily Spin` button.
- `app.js`: Spin gating, wheel animation, reward selection, and localStorage ledger.

## Acceptance Criteria
- Logged-in users see the modal on first visit of the day (or can open via `Daily Spin`).
- Clicking SPIN animates the wheel and resolves to a reward, then records the spin as taken today.
- Guests do not auto-open the modal (but can open via the button).

## Notes
- This is a UI-only implementation using localStorage; backend linking for wallet/points can be added later.
