# Card Bazaar Roadmap (Updated)

This roadmap reflects what exists in the repo today and what remains. It also suggests a near-term sequence to turn prototypes into production features.

Legend:
- Impact: High / Medium / Low (value to users/business)
- Difficulty: Low / Medium / High / Very High (engineering + ops complexity)

## Added (Shipped in v1.3 prototype)
- Real-time pricing per card (NM/EX/VG) from Scryfall, with trend color vs last seen.
- Mobile-friendly UI: responsive grid, touch-first condition bar on mobile.
- Email capture popup (waitlist) with basic validation and local gating.
- Daily Spin modal (once per user) with rewards; credits ledger stored locally.
- Out-of-stock celebration banner and “LAST COPY” badge with per-condition inventory.
- Card testimonials row per card (user seed + copies sold; increments on add-to-cart).
- High-res image viewer overlay for each card (uses Scryfall large/png).
- Header cart with popup, add/remove items; store credit display.
- Binder UI: grid display, drag-and-drop reordering, per-item “Sell 70%” to store credit.
- Binder summary total (valuation at current add-to-cart prices).
- “Open a Pack” modal (prototype) with random pulls by set; add/sell-all actions.
- Personalized “Suggested for You” row (type + color-identity heuristic via Scryfall).
- Same-day delivery option surfaced in checkout for Seattle ZIPs (981xx) as a prototype.

## Prototypes / Partial Implementations
- Authentication: permissive local login only; no backend, no sessions.
- Checkout: modal-only flow with address capture; no payment integration. Applies store credit and moves purchased items into Binder when logged in.
- Binder valuation “up/down”: summary total exists, but no time-series tracking of value changes.
- Ads banner to sister “Card Bazaar Database”: UI present; link/config TBD.

## Not Added Yet
- Related cards (post add-to-cart or stacked behind main image).
- Fully integrated checkout (Stripe or wallets), webhooks, order history, receipts.
- Production auth (accounts, sessions, password reset, OAuth), guest→account merge.
- Live high-res scanning pipeline (own scans, storage, CDN) beyond Scryfall images.
- Phone scanning app + mobile storefront; collection ingest and pricing to “sell to us.”
- Binder valuation time-series and P/L deltas.
- Same-day delivery integration with Uber (real carrier integration + ops flow).
- “Magic ETF” fractionalized basket experiment.

## Suggested Near-Term Order
1) Payments and Orders (H/VH): Stripe checkout session with basic order record; email receipt.
2) Accounts (H/H): Real auth + guest→account merge; persistent cart and binder.
3) Inventory (H/H): Server-backed stock counts; reserve on add-to-cart; fulfill on paid.
4) Related Cards (M/M): Reinstate with simple similarity heuristic (type/color) and measure CTR.
5) Binder Valuation (H/M): Daily snapshot service; show 7/30-day deltas and P/L since purchase.
6) Email/CRM (M/L): Wire email capture to provider; double opt-in + segments.

## Impact vs. Difficulty (Directional)
- Real-time pricing: High / Medium — shipped.
- Mobile-friendly UI: High / Medium — shipped.
- Email capture: Medium / Low — shipped (backend needed).
- Daily Spin: Medium / Medium — shipped (UI-only).
- Out-of-stock + last copy: Low–Medium / Low–Medium — shipped.
- Testimonials: Medium / Medium — shipped (demo data).
- Related cards: Medium / Medium — not started (tabled previously).
- Integrated checkout: High / Very High — not started.
- Auth + perks: High / High — prototype only.
- High-res scans: High / High — not started (viewer only).
- Ads to sister site: Medium / Low–Medium — UI shipped.
- Open a pack: Medium / Low–Medium — prototype shipped.
- Binder valuation up/down: High / High — partial (summary only).
- Binder UI: Medium / Medium — shipped.
- Same-day delivery (Seattle): Medium / High — prototype only.
- Email capture popup: Medium / Low — shipped.
- “Magic ETF”: High / Very High — not started.

## Notes
- Version shown in UI: “Card Bazaar 1.3 FIXED” (index.html). Dates in prior drafts referenced 2025-08-28; this update reflects current main.
- All Scryfall usage is client-side; server components are intentionally stubbed to keep scope in-repo.

