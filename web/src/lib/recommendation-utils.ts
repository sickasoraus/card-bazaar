import type { RecommendationSeedSource } from "@/hooks/use-recommendations";

type RecommendationAlgorithm = "trending" | "similar_cards" | "recent_activity" | "manual";

export function mapRecommendationSource(source: RecommendationSeedSource): RecommendationAlgorithm {
  switch (source) {
    case "trending_card":
    case "trending_deck":
      return "trending";
    case "similar_card":
      return "similar_cards";
    case "deck_upgrade":
      return "recent_activity";
    case "fallback":
    default:
      return "manual";
  }
}

