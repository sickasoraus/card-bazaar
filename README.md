# Card Bazaar

Card Bazaar is a Magic: The Gathering singles marketplace concept site.  
This version (1.3 FIXED) fetches live card images from the [Scryfall API](https://scryfall.com/docs/api)  
and displays them in a two-column grid with interactive hover overlays showing pricing and condition variants.

## Features
- Fetches MTG card art from the Scryfall API
- Real-time pricing from Scryfall (USD) with condition multipliers (NM=1.00, EX=0.85, VG=0.75)
- Prices are shown only when a card is hovered/selected, integrated into condition buttons (NM/EX/VG)
- Price trend color on condition buttons (green if up since last seen, red if down)
- Variant selector for different conditions/prices
- Double-click card art to add it to your cart and remove items from the cart menu

Notes:
- Prices are refreshed on page load; last-seen comparison is stored locally per browser.

## Mobile Friendly
- Responsive layout: single-column grid on smaller screens.
- Touch behavior: tap a card to reveal condition buttons (desktop uses hover).

## Local Development
- Recommended: Use VS Code with the Live Server or Live Preview extension.
- Or serve locally via terminal:
  - Node: `npx http-server -p 5173` then open http://localhost:5173
  - Python: `py -m http.server 5173` then open http://localhost:5173
- Tests: `npm test` (Node 18+)

## Roadmap & Planning
- See `docs/ROADMAP.md` for categorized features, impact/difficulty, and priorities.
- Contribution and workflow guidance: see `CONTRIBUTING.md`.

## Live Demo
(Once GitHub Pages is enabled, the link will appear here.)

---
*Note: This is a prototype for demonstration purposes only and is not an actual storefront.*
