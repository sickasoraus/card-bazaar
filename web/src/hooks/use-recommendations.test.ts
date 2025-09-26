import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useRecommendations } from "./use-recommendations";

describe("useRecommendations", () => {
  const fetchMock = vi.fn();

  const mockSeed = {
    id: "seed-1",
    scope: "card" as const,
    title: "Upgrade your burn suite",
    reason: "Pairs with your current archetype",
    targetId: "card-123",
    source: "trending_card" as const,
    rank: 1,
    trendScore: 0.88,
    components: { shared_tags: 4 },
    entity: {
      type: "card" as const,
      card: {
        id: "card-123",
        name: "Lightning Bolt",
        setCode: "2XM",
        rarity: "uncommon",
        manaCost: "R",
        image: "https://example.com/card.jpg",
        colorIdentity: ["R"],
      },
    },
    generatedAt: new Date().toISOString(),
  };

  const mockMeta = {
    scope: "card" as const,
    subjectId: "deck-1",
    format: "modern",
    period: "daily",
    surface: "deck_builder",
    resolver: "rule_based",
    count: 1,
  };

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [mockSeed], meta: mockMeta }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("requests recommendations with normalized params", async () => {
    const { result } = renderHook(() =>
      useRecommendations({
        scope: "card",
        subjectId: "deck-1",
        format: " Pioneer ",
        surface: "deck_builder",
        period: "weekly",
        limit: 5,
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/recommendations?scope=card&subjectId=deck-1&surface=deck_builder&period=weekly&format=pioneer&limit=5"
    );
    expect(result.current.seeds).toHaveLength(1);
    expect(result.current.meta?.count).toBe(1);
  });

  it("captures the error message when the API fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    } as Response);

    const { result } = renderHook(() => useRecommendations());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toContain("Not found");
    expect(result.current.seeds).toHaveLength(0);
  });

  it("exposes a refresh helper that triggers another fetch", async () => {
    const { result } = renderHook(() => useRecommendations());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});




