# Company MVP Roadmap

Time horizon: 1 week (solo)

This document captures the MVP components across three departments, preserves the original component wording/quotes, and adds clarifications we agreed on for execution. Use this as the single source of truth for scope and sequencing during this MVP push.

Key policies (agreed):
- Pricing data: Use Scryfall for prices where available; fall back to MTGGoldfish only when Scryfall lacks data.
- CTAs: In buying flows, primary CTA is “Shop premium singles.” On the Sell page, primary CTA is “Sell Now: Same‑Day Payout.”
- Payments: Stripe + Store Credit for MVP. Bitcoin and Cash App appear but are disabled with “Coming soon.”
- Grading: Partner with PSA/CGC (industry standard rubric). Internally, experiment with AI grading.
- Mobile app: Start as a way to view collection and scan cards via camera to add to collection (PWA/native TBD).
- Search: Name‑only search with dropdown suggestions.
- Tagging: Shared, global taxonomy across profile, cart, and deckbuilder.
- Membership: Card Bazaar Gold is premium; guests can browse; free accounts required to sell/use Profile; Gold unlocks perks (free shipping, extra daily spin, higher points/credit opportunities, deckbuilder access, profile badge/avatar, comments on cards).

Shared Tag Schema (initial draft):
- format: standard | modern | legacy | vintage | commander | pauper | pioneer
- color_identity: w | u | b | r | g | c | multicolor (combine as strings, e.g., "wu")
- type: creature | instant | sorcery | artifact | enchantment | planeswalker | land
- theme: blink | +1/+1 | tokens | mill | ramp | stax | combo | control | aggro
- synergy: card‑to‑card tags (e.g., "treasure", "saga", "vehicle")
- series: alt art | promo | etched | foil | showcase
- set: three‑letter Scryfall code
- condition: NM | EX | VG | (others later)
- ownership_state: inventory | collection | watched | wishlisted | listed_for_sale
- provenance_event: acquired | sold | graded | verified | auctioned
- deck_archetype: edh (commander) | modern‑x | standard‑y | etc.

One‑Week MVP Focus (top 5 components, in order):
1) Card Bazaar Buying Cards / Front Page
   - Ship name‑only search dropdown; ensure CTA focus is “Shop premium singles.”
   - Surface “Curated bundles” placeholder and “Sell Now: Same‑Day Payout” path.
   - Ensure Scryfall pricing w/ fallback toggle; maintain condition pricing; simple tagging hooks.
2) Card Database / Deckbuilder (metablazt)
   - Stand up database landing with searchable (name‑only) list; reinforce close‑up card view.
   - Stub deckbuilder landing with “Add to cart from list” handoff.
3) Open a Pack (packs)
   - Keep prototype; add copy for ship‑or‑sell‑all‑for‑70% credit; enable gifting entry point.
4) My Collection / My Binders
   - Portfolio dashboard seed (current value, count); trend badge (prototype).
   - Auto‑list button to sell to buylist (stub) and list on auction (Beta stub).
5) My Profile
   - Daily perks placeholder (store credit view; daily spin access); profile “Gold” upsell.
   - Watchlist/Wishlist scaffolding; transactions list stub.

—

## Prioritization & Sequencing (P0/P1/P2)

Principles: P0 converts first‑time buyers/sellers now with low/medium effort; P1 builds scalable foundations this week; P2 follows after MVP or when capacity allows.

### Buying Cards / Front Page
- P0: Search by name dropdown; Primary CTAs alignment; Real‑time pricing policy (Scryfall primary, Goldfish fallback); Deployed site + HTTPS + trust badges/testimonials.
- P1: “Cards I’m interested” curated rails; “User is interested” rails from local signals; Tagging seed across profile/cart/decks; Stacked card rows; Curated bundles; Your Sell List (stub).
- P2: Real scans + condition/user reviews; Card provenance; Animations (shuffle).

### Card Database / Deckbuilder (metablazt)
- P0: DB landing with name search + close‑up view; Deck list → cart handoff (stub).
- P1: DB tagging (+1/+1 etc.) using shared schema; Deck import.
- P2: AI deckbuilder tools.

### Open a Pack
- P1: Keep prototype; add copy for ship‑to‑me or sell‑all‑for‑70% store credit; Gifting entry (stub).
- P2: Variant site (“turn site into a pack”).

### My Collection / My Binders
- P0: Portfolio dashboard seed (count + current value); Binders baseline.
- P1: Cross‑surface presence (DB + deckbuilder); Auto list to buylist + auction (stub flows).
- P2: Trending vs buylist surface.

### My Profile
- P0: Daily perks surface (credit + daily spin); Gold upsell + free account gating to sell/profile.
- P1: Transaction history (stub); Watchlist; Wishlist/back‑in‑stock.
- P2: Spotify‑like personalization; Quests; Rewards catalog.

### Card Bazaar Data
- P1: Landing with sections for MTG financial/card/deck data (content).
- P2: APIs/charts later.

### Auction (BETA)
- P1: Show cards listed from My Collection on Auction page (front‑page style tiles), labeled Beta.
- P2: Live auctions/sales; events; fees/dynamic pricing; profile/ratings; wanted board; tiers; null zone.

### Mobile App
- P1: PWA camera scan → add to collection; view collection.
- P2: Notifications; browse inventory mobile UX.

### Card ETF
- P1: Editorial concept page + our shelf ETF tracker (no sales); disclaimers.
- P2: Full scans of Top 50 vintage.

### Selling Cards (sell page)
- P0: Upload image stored locally; instant estimate (copy/UI); price‑match copy; payout options UI (Stripe + Credit visible; Bitcoin/Cash App greyed “Coming soon”); “Same‑Day Payout” as copy only (no purchasing yet).
- P1: Broad buylist intake; Card confessional; Narrative personas in flows.
- P2: Automated grading thresholds/policies.

### Inventory (internal)
- P0: Setup Stripe (account + test keys); Inventory structure for buy/sell lists.
- P1: Rare alternates curation; Sealed inventory seed.
- P2: LLC/legal ops (track outside repo); Shipping playbook.

### Shipping (internal)
- P1: Same‑day local delivery copy/FAQ; Courier contract placeholder.

### Grading (internal)
- P2: Partner (PSA/CGC) mapping; internal AI grading R&D.

### Growth & Community
- Blog/Newsletter: P1 newsletter + blog landing; P2 ads/social/community/set rollouts/YouTube/logo; Watchlist emails later (ESP integration path: Mailchimp).
- Premium (Gold): P1 perks page + gating rules; P2 enforcement across app.
- Support: P0 support page with FAQ and flows.

—

## One‑Week Scrum Plan (Days 1–7)

Notes: No coding yet in this doc; this is the execution map. All emails route to local outbox initially; prepare for Mailchimp by isolating an ESP adapter interface. Payments in Stripe test mode only; USD.

Day 1 — Trust & Discovery
- Front page: Primary CTAs (“Shop premium singles” on buy flows; “Sell Now: Same‑Day Payout” on Sell page).
- Search: Name‑only dropdown; track searches and clicks.
- Deploy/HTTPS: baseline deployment and security copy; surface testimonials/trust badges.
- Support page: FAQ + flows for refunds/missing/tracking/condition/mispacks/grading disputes.
- Deliverables: working search; visible CTAs; support page live; trust copy in header/footer.
- Dependencies: none.

Day 2 — Payments & Orders (Skeleton)
- Stripe: create account, collect test API keys, set `.env` scaffolding; USD pricing policy ties to Scryfall (fallback MTGGoldfish).
- Checkout: test‑mode checkout session stub; order record; email receipt to outbox.
- Store credit: ensure ledger continuity in header/profile.
- Deliverables: successful test checkout to outbox, order record stored; .env template documented.
- Dependencies: Stripe account.

Day 3 — Seller Intake (Copy‑First; Local Uploads)
- Sell page: image upload stored locally (`data/uploads`); instant estimate UI (copy);
- Price match guarantee copy; payout options UI showing Stripe + Store Credit (informational); Bitcoin/Cash App greyed “Coming soon”.
- Same‑Day Payout: copy only for now (no purchasing of customer cards).
- Deliverables: working upload to local storage; confirmation screen; email to outbox; admin‑review posture.
- Dependencies: local storage path, file size/type limits.

Day 4 — Collection & Profile Foundations
- My Collection: portfolio seed (count + current value); binders baseline integration.
- Profile: free account gating for selling/profile; Card Bazaar Gold upsell page.
- Transactions: stub list from orders/binder actions.
- Deliverables: collection dashboard; profile gating UX; Gold perks page.
- Dependencies: minimal auth/session; store credit display.

Day 5 — Database + Deck Handoff + Tag Schema
- Database landing with name search and close‑up viewer; deck list → cart (stub).
- Shared tag schema: expose JSON source and wire basic usage in UI (profile/cart/db alignment).
- Deliverables: searchable DB page; deck handoff button; tag schema file documented.
- Dependencies: none beyond existing Scryfall fetch.

Day 6 — Auction Beta + Packs + Data + ETF
- Auction (BETA): show listings from user’s collection marked “listed”; front‑page tile style; detail view; “Buy” disabled/coming soon.
- Packs: copy for ship‑to‑me or sell‑all‑for‑70% store credit; gifting entry stub.
- Data portal: Card Bazaar Data landing (financial/card/deck sections).
- ETF: editorial concept page; tracker value snapshot; clear disclaimers.
- Deliverables: public Auction Beta list from collection; packs copy; data and ETF pages live.
- Dependencies: collection listing flag; valuation snapshot.

Day 7 — Mobile + Email Provider Adapter + Polish
- Mobile PWA: manifest + service worker; camera scan prototype (getUserMedia) to add photo→collection.
- Emails: introduce ESP adapter with Mailchimp path (keys optional); continue writing `.eml` to outbox if unset.
- Watchlist/Wishlist: UI stubs tie into adapter; route to outbox initially.
- QA: buyer/seller critical flows; copy consistency; “Beta” labels.
- Deliverables: PWA installable; scan→collection demo; ESP adapter; stubs wired.
- Dependencies: none beyond browser support.

—

## Progress — 2025-09-14

Shipped user‑visible features and wiring to accelerate conversion and repeat visits.

Product & Technology
- Front Page Trending: Infinite scroll with related fill to ~200; headline cards added (The One Ring, The Soul Stone, Eddie Brock // Venom, The Aetherspark). Local image overrides supported. Path‑specific configs: `config/trending.json`, `config/{standard,modern,commander}.json`.
- Search: Header search bar (name‑only) that shows the searched card result.
- Navigation: Right‑side menu reworked — removed Standard/Modern/Commander/Sealed buttons; equalized button sizes; added/ordered: Trending, Vintage, Gold, Auction (Beta), Blog / About Us, Support; “My Profile” now sits directly under Login/Logout; “My Binder” sized like others.
- Binder as Page: `/collection/` renders binder inline with drag, sell 70%, remove.
- Auction (BETA): `/auction/` lists items you mark “List for Auction” from binder; shows seller info, rating, verified badge (prototype; local storage).
- Gold Membership: Gold perks popup (free shipping, 1% off, 24h early access, extra spin, deckbuilder access).
- My Profile: Popup (login‑gated) with membership status, daily quests, rewards credit, watchlist/wishlist/transactions placeholders.
- Sell Flow: Added “Sell Cards” button to header (left of Cart). New `/sell/` page where clicking cards adds to a Sell Order. Cart popup now shows a Sell Order section with Confirm.

Commerce & Operations
- Sell Order Confirmation: `POST /api/sell/submit` sends confirmation email (dev outbox) with “ship within 7 days” instruction; event tracked.

Notes
- Personalization: Views, binder seeds blended into feed when logged in (local storage); global `window.CB_Activity.record(type, name)` hook available for DB/Deck integrations.
- All work is prototype‑safe; Auction data is localStorage for now.

Suggested Next Focus (tomorrow)
- Sell page: Add curated `config/sell.json` and condition selection on add.
- Persist Auction listings in SQLite; add listing detail view.
- Search UX: multi‑match dropdown, keyboard nav, and routeable `/search?q=`.
- Support skeleton page and copy.
- Vintage config curation; image assets for headline cards in `assets/cards/`.

Owner & Status Tracking
- Daily standup checklist: maintain a simple status list per day (Done/Blocked/Next) referencing the above deliverables.
- Risks: Stripe onboarding delays; browser camera permissions; image storage quota; ESP API rate limits (future).

## Product & Technology

### Card Bazaar Buying cards / Front Page (cardbazaar.com)
“we buy the cards we want to put into our decks and binders”

Status: Backlog | Owner: Unassigned | KPIs: CTR on CTAs, conversion to add‑to‑cart, search success rate

1. Cards I am interested in right now:
   - The One Ring, Kefka Court Mage, Ancient Tomb, New Spider Man Card, Rare Aetherspark Variant
   - standard, modern, vintage, commander, new sealed, booster packs, card of the day, pack of the day, trending cards, most sold cards, most bought cards
   - Cool, Rare, Alternate cards I haven’t seen before
2. Cards a user is interested in right now:
   - my profile: cards they have looked at, cards they have purchase
   - database: cards they have looked at, cards they have built a deck for
3. Search the website for a card or sealed product (name‑only dropdown)
4. Stacks of cards in rows instead of neat rows
5. Website Deployed (domain, hosting)
6. Website Secure (https, security badges, affiliations, testimonials)
7. Real scans for card inventory (condition ratings, user reviews, if you grade we pay)
8. Animations on actions (shuffle cards)
9. Real time pricing (Scryfall primary; MTGGoldfish fallback)
10. Tagging system for related cards (my profile, my cart, you looked at this card, you bought this card, these cards are in my collection, these cards are in my decks on deck builder)
11. Card provenance (badges, transaction tracking, narrative around ownership)
12. Your Sell List (cards from your collection you have listed on auction: beta)
13. Curated card bundles (new players)
14. Prominent CTA: “Sell now for same‑day payout” or “Shop premium singles.”

### Card Bazaar Card Database / Deckbuilder (cardbazaar.com/metablazt)
“we like to build decks, and simulate our opponents decks”

Status: Backlog | Owner: Unassigned | KPIs: searches, deck starts, add‑to‑cart from decklist

1. Card Database: Bigger, different cards than mtgbrawl.net; reinforce close‑up viewing; scans for unusual cards
2. Deck Builder: AI Tools
3. Deck builder deck list to cart
4. Tagging system for database (cards go in +1/+1)
5. Import deck data from another source
6. Card Search on database (name‑only)

### Card Bazaar Open a Pack (cardbazaar.com/packs)
“we open packs and keep the rares, selling the rest”

Status: Backlog (prototype exists) | Owner: Unassigned | KPIs: opens, gift conversions, sell‑all rate

1. Turn card bazaar into a booster pack (separate site, turn site into a pack)
2. Open any pack with us; after opening, ship desired cards for a fee or sell all at 70% store credit
3. Gift another member packs

### Card Bazaar My Collection / My Binders (cardbazaar.com/collection)
“we invest in cards we think will appreciate”

Status: Backlog (binder prototype exists) | Owner: Unassigned | KPIs: collection size, valuation growth, sell‑through

1. Track My Collection: portfolio dashboard; story of collection value (up/down)
2. My Binders (My Safe)
3. Cards in My Collection also show on Card Database and deckbuilder
4. Show what cards in your collection are trending on our buylist
5. Auto list card button to sell to buylist or list on auction (beta)

### Card Bazaar My Profile (cardbazaar.com/profile)

Status: Backlog (login prototype exists) | Owner: Unassigned | KPIs: DAU, retention, perks usage, Gold conversion

1. Perks of logging in everyday (store credit balance, collection, daily spin)
2. Profile feels like Spotify (personalization, easy actions)
3. Card Bazaar Gold (premium): free shipping, extra daily spin, increased points/store credit opportunities, deckbuilder access, badge + avatar, comments on cards (sold, being sold, database)
4. Bazaar quests: weekly missions (e.g., sell 3 foils; buy 1 black‑bordered card) for points/cosmetics
5. Rewards: points for purchases; redeem for shipping/merch (not cash/store credit). Store credit usable for cards/shipping.
6. Watchlist (AI price alerts “the watcher”)
7. Wishlist (back in stock emails)
8. Transaction History

### Card Bazaar Data (cardbazaar.com/data)

Status: Backlog | Owner: Unassigned | KPIs: data views, API hits (later)

1. MTG financial data
2. MTG card data
3. MTG deck data

### Card Bazaar Auction (BETA) (cardbazaar.com/auction)

Status: Backlog (Beta) | Owner: Unassigned | KPI: GMV, seller NPS, time‑to‑ship

1. Third‑party seller marketplace: buyers purchase; we escrow; ship upon receipt/verification
2. Auction and live selling
3. Collector events
4. Lower fees for sellers
5. Dynamic pricing (rarity + demand)
6. Transparent seller profiles & reputation
7. Seller ratings, verified program
8. Wanted cards bulletin board (buyers post bounties)
9. Seller tiers (free vs pro)
10. The null zone: owners can remove their card from marketplace permanently

### Card Bazaar Mobile App (cardbazaar.com)

Status: Backlog | Owner: Unassigned | KPIs: scans, adds‑to‑collection, mobile DAU

1. Scan cards with Mobile App, see scans in My Collection
2. Notifications (watchlist, back in stock)
3. Browse inventory (responsive mobile design for website)
4. View your collection

### Card Bazaar Card ETF

Status: Backlog (Concept + real shelf ETF) | Owner: Unassigned | KPIs: ETF page views, tracked index engagement

1. A scan of every card in the Top 50 Vintage Cards
2. Buy/sell shares of the basket (concept); present real tracked value for our held ETF unit
3. Investing page: thesis on MTG over long term; fun + playable investment

—

## Commerce & Operations

### Card Bazaar Selling Cards (cardbazaar.com/sell)
“When selling cards to Card Bazaar, I know I will get the best, most secure deal”

Status: Backlog | Owner: Unassigned | KPIs: submissions, payout time, match rate

1. Upload scans to estimate grade/payout (100% match → grade; 90% match → 90% payout)
2. Price match guarantee with other sellers
3. Widest buylist (incl. Japanese, off‑buylist)
4. Payout in Cash, Store Credit, PayPal, Cash App, Bitcoin (MVP: Stripe + Credit; others disabled)
5. Card confessional: seller memories
6. Narrative UX roles (e.g., bard / vault dweller) for buy/sell flows

### Card Bazaar Inventory (internal)

Status: Backlog | Owner: Unassigned | KPIs: in‑stock %, time‑to‑list

1. LLC Card Bazaar
2. Setup Stripe
3. Cards In Inventory (Buylist, Selllist)
4. Cool cards, rare alternates (Inventory)
5. Ship Fast (Courier)
6. Sealed in Inventory

### Card Bazaar Shipping (internal)

Status: Backlog | Owner: Unassigned | KPIs: delivery time, same‑day coverage

1. Contract with Courier (Postage, Packaging)
2. Same day local delivery (membership)

### Card Bazaar Grading (internal)

Status: Backlog | Owner: Unassigned | KPIs: grading SLA, acceptance rate

1. Grading service (In‑house or partner grading; build trust). Partner with PSA/CGC; internal AI grading R&D.

—

## Growth & Community

### Card Bazaar Weekly Marketing/Blog/Investing/Newsletter (cardbazaar.com/blog)

Status: Backlog | Owner: Unassigned | KPIs: subscribers, CTR, conversions

1. Buy Ads (ad units + social content)
2. Run Social Media Content (rare card photos in unique settings)
3. Engage with communities (reddit posts, website updates)
4. Build excitement for new set rollouts (editorial)
5. MTG YouTube (show buying/selling experience)
6. Card Bazaar Logo, Merch
7. Weekly Newsletter (hot buylist, market update, collection highlights, investing, hot decks, promos, editorial, ads)
8. Watchlist Emails (track prices, back in stock, link to newsletter)
9. Vlog/Blog (editorials, investing, promotions)

### Card Bazaar Premium Membership (cardbazaar.com/profile)

Status: Backlog | Owner: Unassigned | KPIs: Gold conversion, churn, perk usage

1. Premium Membership (Card Bazaar Gold):
   - Free Shipping
   - Early Access to New Inventory
   - Deck Builder access
   - Open a pack website access/perks

### Card Bazaar Support Page (cardbazaar.com/support)

Status: Backlog | Owner: Unassigned | KPIs: resolution time, CSAT

1. FAQ (common questions, processes, policies)
2. System for Refunds, Missing Packages, Tracking Updates, Condition Complaints, Mispacks, Grading Disputes

—

Links:
- Roadmap summary: ./ROADMAP.md
- This doc: docs/COMPANY_MVP_ROADMAP.md
## Progress — 2025-09-15

Card Bazaar Database MVP and follow-ups shipped.

- Database Page: `/db/` (Trending via Scryfall edhrec proxy, capped at 100), `/db/vintage/` (starter staples); no pricing, scan-first images.
- DB Theme: dark navy gradient + coral accents; applied on `/db/*`.
- Add to Deck: per-tile button on `/db/*`, prompts deck creation or selection; persists to SQLite.
- Decks API: `GET/POST /api/decks`, `GET /api/decks/:id`, `POST /api/decks/:id/{add|remove}`.
- Decks Page: `/db/decks/` minimal list view (expandable detail via API call).
- Auction (BETA) persistence: create/unlist listings from binder; `/api/listings`, `/api/listings/:id`; Auction list/detail now DB-backed.
- Admin Scans Page: `/admin/scans/` simple uploader for public scans by card slug.
- Animations: global button press-in; cart badge bounce on add-to-cart.

Next
- DB sidebar button wiring (native); richer deck UI with inline editing; condition stack spring animations; scheduled pricing snapshots.
