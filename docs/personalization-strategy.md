# Personalization Seeds & Recommendation Plan (Phase 3)

_Last updated: 2025-09-26_

This reference outlines the initial seed strategies for Metablazt recommendations and how they map to our Supabase schema/telemetry.

**Status notes:**
- 2025-09-26: Deck builder recommendations panel is live, sourcing cards from `/api/recommendations` and logging `recommendation_served` events.
- 2025-09-26: Homepage trending rail uses trending seeds fed by Supabase metrics.
- 2025-09-28: Similarity + deck upgrade models now persist to `card_similarity`, `deck_upgrade_candidates`, and `user_similarity_scores` for Phase 5 experiments.


## Seed Types

| Seed | Description | Data Sources | Telemetry Touchpoints |
| --- | --- | --- | --- |
| Trending Picks | High-performing cards/decks ranked by 	rending_snapshots. | card_daily_metrics, deck_daily_metrics, 	rending_snapshots | 	rackDeckViewed, 	rackCardViewed, 	rackBridgeInitiated |
| Similar Cards | Cards that share color identity, tags, and similarity vectors with the viewed card. | card_similarity, card_tags, card_daily_metrics, prices | \trackCardViewed, \trackRecommendationServed |
| Deck Upgrade Suggestions | Cards under-represented in a player deck but popular in similar archetypes. | deck_upgrade_candidates, deck_daily_metrics, imports, prices | \trackDeckImported, \trackDeckCardAdded, \trackRecommendationServed |
| Recently Viewed | Session + account-level recency for quick recall. | event_log (card_viewed, deck_viewed) | \trackDeckViewed, \trackCardViewed |
| Affinity Feed | Collaborative filtering feed seeded from similar user behaviour. | user_similarity_scores, recommendations | \trackRecommendationServed |

## Delivery Surfaces

- **Homepage rails**: Daily trending cards and decks (5-per rail). Use 	rackRecommendationServed with surface="homepage".
- **Deck builder sidebar**: “Upgrade ideas” panel seeded by deck format, missing cards, and trending synergies. Use 	rackRecommendationServed with surface="deck_builder" plus 	rackDeckImported for follow-up.
- **Card detail modal**: Similar cards + price movers seeded via card_daily_metrics; log 	rackBridgeInitiated when the user opens the Cart Bazaar bridge.

## Implementation Checklist

1. **API layer**
   - Build GET /api/recommendations supporting surface, scope, and limit params.
   - Hydrate from 
ecommendations table when available; fall back to deterministic seeds using the services below.
2. **Services**
   - 
ecommendationSeeds.getTrendingCards(limit, format?)
   - 
ecommendationSeeds.getSimilarCards(cardId, limit)
   - 
ecommendationSeeds.getDeckUpgrades(deckId, limit)
3. **Telemetry**
   - Emit 	rackRecommendationServed when recommendations render.
   - Continue using 	rackBridgeInitiated / 	rackDeckImported so commerce conversion funnels stay measurable.
4. **Storage**
   - Persist generated seeds in 
ecommendations for personalized users; anonymous users fall back to deterministic seeds plus session cache.

## Phase 5 Enhancements

- Similarity jobs populate `card_similarity` nightly so `/api/recommendations?scope=card` can lean on precomputed neighbours.
- Deck upgrade models persist top recommendations per deck into `deck_upgrade_candidates` and expose `upgradeScore` metrics.
- Affinity jobs log collaborative filtering edges into `user_similarity_scores` ahead of personalized feeds.

## Data Refresh

- Trending seeds refresh hourly alongside 	rending_refresh cron.
- Similar cards recompute nightly (top 2000 cards) with incremental updates when tags change.
- Deck upgrades recompute on deck_imported + deck_card_added deltas (batch job; store results in 
ecommendations).

With these scaffolds in place we can ship Phase 3 personalization quickly once trending analytics and cron jobs land.
