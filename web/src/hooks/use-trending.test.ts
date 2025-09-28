import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTrending } from "./use-trending";

describe("useTrending", () => {
  const fetchMock = vi.fn();

  const mockPayload = {
    data: [
      {
        rank: 1,
        scope: "card" as const,
        period: "daily" as const,
        subjectId: "card-123",
        trendScore: 9.5,
        components: { views: 128, deck_inclusions: 42, price_growth: 0.12 },
        calculatedAt: new Date().toISOString(),
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
    ],
    meta: {
      scope: "card" as const,
      period: "daily" as const,
      format: null,
      count: 1,
      fallback: false,
      hasDatabase: true,
      lastCalculatedAt: null,
      jobs: {
        telemetryRollup: null,
        trendingRefresh: null,
      },
    },
  };

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockPayload,
    } as Response);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("fetches trending data with normalized search params", async () => {
    const { result } = renderHook(() =>
      useTrending({ scope: "card", period: "weekly", limit: 3, format: " Modern " })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/trending?scope=card&period=weekly&limit=3&format=modern");
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.meta?.fallback).toBe(false);
    expect(result.current.meta?.hasDatabase).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("surfaces errors when the request fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Trending request failed" }),
    } as Response);

    const { result } = renderHook(() => useTrending());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toContain("Trending request failed");
    expect(result.current.entries).toHaveLength(0);
  });

  it("refresh triggers a subsequent fetch", async () => {
    const { result } = renderHook(() => useTrending());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});