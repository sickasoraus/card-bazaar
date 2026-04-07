# Card Bazaar MVP Architecture

This is a static, client-only prototype intended for GitHub Pages. There is no build step; `index.html` loads `styles.css` and ES modules from `js/`.

## Runtime Overview
```
index.html
  -> js/index.mjs
     -> js/app.mjs (UI + state actions)
     -> js/cards.mjs (card grid)
        -> js/scryfall.mjs (Scryfall fetch + helpers)
  -> styles.css
```

## Entry Points
- `index.html`: layout and markup; IDs and classes are the contract with JS.
- `binder.html`: binder dashboard page for collection management and sell orders.
- `styles.css`: global styles extracted from the HTML.
- `js/index.mjs`: boot file that calls `initApp()`.
- `data/front-page/index.json`: curated front-page list (section index + page size).
- `data/front-page/sections/*.json`: per-section card lists with per-card metadata (`set`, `collector`, `lang`, `formats`, `tags`).

## Module Responsibilities
- `js/app.mjs`: UI controller. Wires DOM events, renders cart/binder, checkout modal, login flow, email capture, daily spin, pack opener, suggestions, and the high-res overlay.
- `js/binder.mjs`: binder dashboard logic (grid layout, live pricing, sell orders, and manual add).
- `js/cards.mjs`: card grid rendering and interaction logic (conditions, inventory, price deltas, testimonials, and grid refresh). Exposes hooks for add-to-cart and high-res overlay.
- `js/api.mjs`: small wrapper around Scryfall helpers; exposes `api.cards.*`.
- `js/scryfall.mjs`: fetch utilities and card image/price extractors.
- `js/state.mjs`: in-memory state + actions (cart/binder/store credit/user). Persists selected slices to `localStorage`.
- `js/storage.mjs`: safe `localStorage` helpers and key constants.
- `js/ui/overlays.mjs`: overlay show/hide helper.
- `js/ui/notify.mjs`: notification helper (alert/console).

## Data Flow
1) `js/index.mjs` calls `initApp()` in `js/app.mjs`.
2) `initApp()` wires DOM handlers and calls `initCardGrid()` in `js/cards.mjs`.
3) `js/cards.mjs` fetches card data and renders tiles.
4) UI actions call `state.mjs` actions (add/remove cart, binder, store credit).
5) `js/app.mjs` re-renders the cart and binder views after state changes.

## State and Persistence
- Persisted locally: `cb_store_credit`, `cb_binder`, `user`, email capture keys, spin tracking keys.
- In-memory only: cart contents (resets on refresh).

## External Services
- Scryfall API is called directly from the browser for card data, images, and pricing.

## Tests
- `tests/fetchCardImages.test.js` validates card grid behavior and stack cycling.

## Extension Points
- New UI sections: add markup in `index.html`, styles in `styles.css`, and wiring in `js/app.mjs`.
- Card grid changes: `js/cards.mjs`.
- Persistence or app-wide data changes: `js/state.mjs` and `js/storage.mjs`.
