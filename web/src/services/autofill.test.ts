import { beforeEach, describe, expect, it, vi } from "vitest";

import { getTrendingSeeds, getSimilarCardSeeds } from "@/services/recommendation-seeds";
import { getAutofillSuggestions } from "./autofill";

vi.mock("@/services/recommendation-seeds", () => ({
  getTrendingSeeds: vi.fn(),
  getSimilarCardSeeds: vi.fn(),
}));

const mockedTrending = vi.mocked(getTrendingSeeds);
const mockedSimilar = vi.mocked(getSimilarCardSeeds);

describe("getAutofillSuggestions", () => {
  beforeEach(() => {
    mockedTrending.mockReset();
    mockedSimilar.mockReset();
  });

  it("returns trending seeds filtered by deck contents", async () => {
    mockedTrending.mockResolvedValue([
      {
        id: "seed-1",
        scope: "card",
        title: "Sheoldred, the Apocalypse",
        reason: "Trending momentum across the catalog.",
        targetId: "card-sheoldred",
        source: "trending_card",
        entity: {
          type: "card" as const,
          card: {
            id: "card-sheoldred",
            name: "Sheoldred, the Apocalypse",
            setCode: "DMU",
            rarity: "mythic",
            manaCost: "2BB",
            image: "https://example.com/sheoldred.jpg",
            colorIdentity: ["R"],
          },
        },
        generatedAt: new Date().toISOString(),
        fallback: false,
      },
    ]);
    mockedSimilar.mockResolvedValue([]);

    const suggestions = await getAutofillSuggestions({
      cards: [
        { cardId: "card-lightning-bolt", name: "Lightning Bolt", quantity: 4 },
        { cardId: "card-opt", name: "Opt", quantity: 4 },
      ],
      format: "modern",
      colors: ["R"],
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.cardId).toBe("card-sheoldred");
  });

  it("excludes cards already in deck", async () => {
    mockedTrending.mockResolvedValue([
      {
        id: "seed-duplicate",
        scope: "card",
        title: "Opt",
        reason: "Trending",
        targetId: "card-opt",
        source: "trending_card",
        entity: {
          type: "card" as const,
          card: {
            id: "card-opt",
            name: "Opt",
            setCode: "STX",
            rarity: "common",
            manaCost: "U",
            image: null,
            colorIdentity: ["U"],
          },
        },
        generatedAt: new Date().toISOString(),
        fallback: false,
      },
    ]);
    mockedSimilar.mockResolvedValue([]);

    const suggestions = await getAutofillSuggestions({
      cards: [{ cardId: "card-opt", name: "Opt", quantity: 4 }],
    });

    expect(suggestions).toHaveLength(0);
  });
});
