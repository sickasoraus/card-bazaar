# Updating Trending Cards

This site reads a simple config at `config/trending.json` to seed the front‑page Trending list. You can add or remove entries without touching code.

File: `config/trending.json`

Structure:
- `items`: array of entries. Each entry can include:
  - `kind`: `"card"` (default) or `"booster"` (for packs).
  - `name`: Scryfall card name (exact or close; we try exact first, then fuzzy).
  - `setHint`: optional Scryfall set code (e.g., `"ltr"`, `"spm"`, `"dft"`) to prefer a specific printing.
  - `image`: optional local image override path (e.g., `/assets/cards/the-one-ring.jpg`). If present and found, it is used first; otherwise Scryfall images are used.

Notes:
- The front page uses infinite scroll and will auto‑fill beyond your list up to ~200 cards by fetching related cards from Scryfall.
- If a user is logged in, we also blend in personalized picks (recently viewed, in collection, and deck/database activity) ahead of related fill.

Local Images (optional):
- Put images under `assets/cards/` and reference them via the entry’s `image` field.
- If the file is missing or cannot be loaded, the UI falls back to Scryfall’s image for that card.

Examples:
```json
{
  "items": [
    { "kind": "card", "name": "The One Ring", "setHint": "ltr", "image": "/assets/cards/the-one-ring.jpg" },
    { "kind": "card", "name": "The Soul Stone", "setHint": "spm" },
    { "kind": "card", "name": "Eddie Brock // Venom, Lethal Protector", "setHint": "spm" },
    { "kind": "card", "name": "The Aetherspark", "setHint": "dft" }
  ]
}
```

Advanced:
- To change Standard/Modern/Commander pages, either add `config/standard.json`, `config/modern.json`, or `config/commander.json` with the same structure, or rely on built‑in defaults and personalization.

