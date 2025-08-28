# PR: Out-of-Stock Celebration + Last Copy Badge

## Summary
- Adds a celebratory overlay when a condition is bought out: “No longer in stock because of you. Lucky find!”.
- Shows a pulsing “LAST COPY” badge when an active condition has 1 remaining.
- Decrements per-card, per-condition inventory on add to cart (local UI state), updates button counts, and disables sold-out conditions.

## Files Changed
- `index.html`: CSS for celebration banner, last-copy badge, disabled condition buttons, and sold-out styling.
- `fetchCardImages.js`: Per-card inventory state; UI updates on add-to-cart; overlay/badge logic.

## Acceptance Criteria
- Clicking “Add to Cart” or double-clicking the image decrements the active condition count for that card.
- When a condition reaches 1, a “LAST COPY” badge appears on the stack.
- When a condition reaches 0, the image dims and a celebratory overlay appears; the condition button becomes disabled.

## Notes
- Inventory is a client-side demo state (not persisted across reloads, not authoritative). Real inventory integration can swap in server APIs later.
