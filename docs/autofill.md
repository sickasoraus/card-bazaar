# Autofill Prototype (Phase 4)

_Last updated: 2025-09-28_

The rule-based autofill service provides quick card recommendations when a drafter wants to pad out their mainboard. This MVP leans on existing recommendation seeds so the UI can ship before we train a bespoke model.

## Inputs

`POST /api/autofill`

```json
{
  "deckId": "uuid",
  "deckName": "Izzet Phoenix",
  "format": "modern",
  "colors": ["U", "R"],
  "cards": [
    { "cardId": "card-123", "name": "Lightning Bolt", "quantity": 4 },
    { "cardId": "card-456", "name": "Consider", "quantity": 4 }
  ],
  "limit": 10
}
```

- `cards` must include mainboard entries with quantities.
- `colors` are optional (W/U/B/R/G). When absent we default to color-agnostic suggestions.

## Suggestion Logic

1. Pull up to 30 trending card seeds for the requested format.
2. Filter out cards already in the deck and enforce color identity if a palette is supplied.
3. Add similar-card seeds keyed to the first few cards in the deck for archetype context.
4. Deduplicate by card id and return up to `limit` suggestions (default 10).

Each suggestion includes: card id, name, set code, mana cost, color identity, image, seed id, and a human-readable reason.

## Telemetry

- `deck_autofill_action`
  - `requested`: user taps "Generate suggestions".
  - `received`: API returns suggestions (include `suggestionCount`).
  - `added`: user adds a single suggestion.
  - `add_all`: user adds every suggestion en masse.
  - `dismissed`: modal/panel closed without adding.

## Future Enhancements

- Replace rule-based seed blend with ML-driven ranking once we accumulate enough simulator + deck usage data.
- Include mana curve coverage (lands vs spells) in the recommendation context.
- Support sideboard suggestions and commander-specific constraints.
- Introduce user-saved profiles (favorite archetypes) to bias suggestions.


## UI Integration

- Deck builder exposes an "Autofill suggestions" panel that POSTs to `/api/autofill`, shows loading skeletons, add/add-all actions, and tracks `deck_autofill_action` telemetry events.
- Suggestions can be cleared or refreshed without reloading the page; fallback seeds render when Supabase metrics are unavailable.
