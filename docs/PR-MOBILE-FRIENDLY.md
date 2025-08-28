# PR: Mobile-Friendly UI Improvements

## Summary
- Improves responsive layout (single-column grid, adjusted paddings on small screens).
- Adds touch-friendly behavior: tap the card image to toggle the condition bar on coarse pointers (mobile/tablet). Desktop remains hover-only.
- Keeps existing interactions intact (cart add, condition switching, pricing display).

## Files Changed
- `index.html`: CSS tweaks for small screens (grid padding, button sizing).
- `fetchCardImages.js`: Detects coarse pointers; toggles condition bar on tap; preserves hover on desktop.

## Acceptance Criteria
- On mobile/tablet (coarse pointer), tapping a card toggles the NM/EX/VG condition bar.
- On desktop, hovering the card shows the condition bar; leaving hides it.
- Layout remains readable and usable on small screens.

## How to Test
1. Resize browser to phone width or use device emulation; or test on a phone.
2. Tap a card: the condition bar opens/closes.
3. Desktop: hover shows the bar; clicking still cycles variants.

## Notes
- This maintains the “hover” requirement for desktop while making mobile usable.
