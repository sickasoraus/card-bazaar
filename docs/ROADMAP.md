# Card Bazaar Roadmap

This document organizes the requested features by category, estimates impact and difficulty, and proposes a practical build order. Ratings are directional to help planning, not precise time commitments.

Legend:
- Impact: High / Medium / Low (value to users/business)
- Difficulty: Low / Medium / High / Very High (engineering + ops complexity)

## Core Commerce
- 12) Fully integrated checkout (Stripe + multiple wallets)
  - Impact: High
  - Difficulty: Very High (PCI concerns, provider integrations, webhooks, testing)
- 13) Make the website mobile friendly (in test - currently merged, 2025-08-28)
  - Impact: High
  - Difficulty: Medium (responsive layout, touch UX, performance)
- 2) Real-time card price on each card (in test - currently merged, 2025-08-28)
  - Impact: High
  - Difficulty: Medium (use Scryfall/partner pricing; caching, fallbacks)

## Accounts & Personalization
- 1) Login + guest checkout + perks (binder, personalized suggestions, selling)
  - Impact: High
  - Difficulty: High (auth, profiles, personalization, binder linkage)
- 15) Binder value up/down tracking
  - Impact: High
  - Difficulty: High (portfolio-like valuations, price feed, deltas)
- 16) Show cards in an actual binder UI
  - Impact: Medium
  - Difficulty: Medium (grid layout, drag/drop, animations)

## Engagement & Growth
- 18) Email capture popup for waitlist
  - Impact: Medium
  - Difficulty: Low (modal + backend list or provider)
- 3) Daily spin-the-wheel reward
  - Impact: Medium
  - Difficulty: Medium (eligibility, reward issuance, anti-abuse)
- 7) Related cards after add-to-cart / behind stack
  - Impact: Medium
  - Difficulty: Medium (similarity heuristic, UI surfacing)
- 10) Card testimonials (e.g., sold counts, seller notes)
  - Impact: Medium
  - Difficulty: Medium (submission + moderation + display)
- 5) “Out of stock because of you” celebration animation
  - Impact: Low–Medium
  - Difficulty: Low–Medium (UX polish, stock state)
- 6) “Last copy, imperfect condition” excitement moment
  - Impact: Low–Medium
  - Difficulty: Medium (inventory-aware UX rules)

## Inventory, Content & Ads
- 4) Live scanned high‑res images for inventory
  - Impact: High (trust, conversion)
  - Difficulty: High (scanning pipeline, storage, CDN)
- 9) Ads to sister “Card Bazaar Database” (editorial/news)
  - Impact: Medium
  - Difficulty: Low–Medium (placement, tracking, cross‑site)

## Mobile & External Apps
- 14) Card scanning app + mobile storefront
  - Impact: High
  - Difficulty: Very High (native app(s) or PWA, vision/ML, sync)
- 8) Scan collection with app → binder → sell to us
  - Impact: High
  - Difficulty: Very High (end‑to‑end ingestion, pricing, offers, logistics)

## Logistics & Operations
- 17) Same‑day delivery in Seattle via Uber Eats
  - Impact: Medium (delight, local growth)
  - Difficulty: High (Ops/fulfillment + integration)

## Financial Experiments
- 19) “Magic ETF” fractionalized basket
  - Impact: High (novelty, engagement)
  - Difficulty: Very High (regulatory, custody, pricing, liquidity, compliance)

---

## Recently Merged (in test)
- 2) Real-time card prices — 2025-08-28
- 13) Mobile friendly — 2025-08-28
- 18) Email capture popup — 2025-08-28
- 3) Daily spin-the-wheel — 2025-08-28
- 5) Out-of-stock celebration — 2025-08-28
- 6) Last-copy excitement — 2025-08-28
- 10) Card testimonials — 2025-08-28
- 7) Related cards — tabled and reverted on 2025-08-28

## Priority Order (Impact vs. Difficulty)

Top (fast impact, manageable complexity)
1. 2) Real-time card prices (H/M) — (in test - currently merged, 2025-08-28)
2. 13) Mobile friendly (H/M) — (in test - currently merged, 2025-08-28)
3. 18) Email capture popup (M/L) — (in test - currently merged, 2025-08-28)
4. 3) Daily spin-the-wheel (M/M) — (in test - currently merged, 2025-08-28)
5. 7) Related cards (M/M) — (tabled; reverted on 2025-08-28)

Next (foundational, heavier lift)
5. 1) Login + guest + perks (H/H)
6. 12) Integrated checkout (H/VH)
7. 15) Binder valuation (H/H)
8. 16) Binder UI (M/M)

Later (ops-heavy or experimental)
9. 4) High‑res scans (H/H)
10. 5) Out‑of‑stock celebration (L–M/L–M) — (in test - currently merged, 2025-08-28)
11. 6) Last‑copy excitement (L–M/M) — (in test - currently merged, 2025-08-28)
12. 9) Ads to sister site (M/L–M)
13. 17) Same‑day delivery (M/H)
14. 8) Scan → binder → sell (H/VH)
15. 14) Scanning app + mobile storefront (H/VH)
16. 19) Magic ETF (H/VH)

---

## First Scrum Suggestion: Real‑Time Pricing (Feature 2)

Why first:
- High user value and visible on every product.
- Leverages existing Scryfall requests already in the codebase.
- Constrains nicely to a 1–2 sprint slice without backend commitments.

Proposed scope (acceptance criteria):
- Show current USD price for each card variant on load.
- Fetch from Scryfall price fields with graceful fallback when missing.
- Display timestamp/“as of” label; refresh price on page reload.
- If variant‑specific pricing is unavailable, apply clear “estimates” with a simple, declared multiplier per condition (e.g., NM=1.00, VG=0.85, EX=0.75, G=0.50) so the UI remains consistent.
- Handle network errors with a user‑friendly message and cached last‑known value (optional stretch).

Tasks:
1) Extend fetch to read `data.prices` from Scryfall.
2) Compute condition pricing with multipliers when needed.
3) Render price + condition; add “as of” tooltip.
4) Add unit tests for price transform logic.
5) Document pricing source and multipliers.

Next sprint candidates:
- Mobile UX improvements (Feature 13): tighten responsive grid, image sizes, tap interactions.
- Email capture (Feature 18): modal + provider hookup (e.g., Mailchimp, ConvertKit) or simple webhook.

