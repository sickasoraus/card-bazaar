# Personalization Seeds & Recommendation Plan (Phase 3)

_Last updated: 2025-09-26_

This reference outlines the initial seed strategies for Metablazt recommendations and how they map to our Supabase schema/telemetry.

## Seed Types

| Seed | Description | Data Sources | Telemetry Touchpoints |
| --- | --- | --- | --- |
| Trending Picks | High-performing cards/decks ranked by 	rending_snapshots. | card_daily_metrics, deck_daily_metrics, 	rending_snapshots | 	rackDeckViewed, 	rackCardViewed, 	rackBridgeInitiated |
| Similar Cards | Cards that share color identity, tags, and usage velocity with the viewed card. | card_tags, card_daily_metrics, prices | 	rackCardViewed, 	rackRecommendationServed |
| Deck Upgrade Suggestions | Cards under-represented in a player deck but popular in similar archetypes. | deck_daily_metrics, imports, prices | 	rackDeckImported, 	rackDeckCardAdded, 	rackRecommendationServed |
| Recently Viewed | Session + account-level recency for quick recall. | event_log (card_viewed, deck_viewed) | 	rackDeckViewed, 	rackCardViewed |

## Delivery Surfaces

- **Homepage rails**: Daily trending cards and decks (5-per rail). Use 	rackRecommendationServed with surface="homepage".
- **Deck builder sidebar**: “Upgrade ideas” panel seeded by deck format, missing cards, and trending synergies. Use 	rackRecommendationServed with surface="deck_builder" plus 	rackDeckImported for follow-up.
- **Card detail modal**: Similar cards + price movers seeded via card_daily_metrics; log 	rackBridgeInitiated when the user opens the Cart Bazaar bridge.

## Implementation Checklist

1. **API layer**
   - Build GET /api/recommendations supporting surface, scope, and limit params.
   - Hydrate from ecommendations table when available; fall back to deterministic seeds using the services below.
2. **Services**
   - ecommendationSeeds.getTrendingCards(limit, format?)
   - ecommendationSeeds.getSimilarCards(cardId, limit)
   - ecommendationSeeds.getDeckUpgrades(deckId, limit)
3. **Telemetry**
   - Emit 	rackRecommendationServed when recommendations render.
   - Continue using 	rackBridgeInitiated / 	rackDeckImported so commerce conversion funnels stay measurable.
4. **Storage**
   - Persist generated seeds in ecommendations for personalized users; anonymous users fall back to deterministic seeds plus session cache.

## Data Refresh

- Trending seeds refresh hourly alongside 	rending_refresh cron.
- Similar cards recompute nightly (top 2000 cards) with incremental updates when tags change.
- Deck upgrades recompute on deck_imported + deck_card_added deltas (batch job; store results in ecommendations).

With these scaffolds in place we can ship Phase 3 personalization quickly once trending analytics and cron jobs land.
