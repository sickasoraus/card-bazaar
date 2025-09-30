import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-trending", () => ({
  useTrending: vi.fn(),
}));

vi.mock("@/services/card-bazaar-bridge", () => ({
  initiateCardBazaarBridge: vi.fn().mockResolvedValue({ bridgeId: "bridge-1", missing: [], ok: true }),
}));

vi.mock("@/lib/telemetry", () => ({
  trackBridgeInitiated: vi.fn(),
}));

import { TrendingRail } from "./trending-rail";
import { useTrending } from "@/hooks/use-trending";
import { initiateCardBazaarBridge } from "@/services/card-bazaar-bridge";
import { trackBridgeInitiated } from "@/lib/telemetry";

describe("TrendingRail", () => {
  const mockUseTrending = vi.mocked(useTrending);
  const mockBridge = vi.mocked(initiateCardBazaarBridge);
  const mockTrack = vi.mocked(trackBridgeInitiated);

  beforeEach(() => {
    mockUseTrending.mockReset();
    mockBridge.mockReset();
    mockTrack.mockReset();
    mockBridge.mockResolvedValue({ bridgeId: "bridge-1", missing: [], ok: true });
  });

  it("renders fallback messaging and status chips when metrics are not yet live", () => {
    mockUseTrending.mockReturnValue({
      entries: [
        {
          rank: 1,
          scope: "card",
          period: "daily",
          subjectId: "card-123",
          trendScore: 7.45,
          components: { views: "128", deck_inclusions: "36", price_growth: "0.125" },
          calculatedAt: new Date().toISOString(),
          card: {
            id: "card-123",
            name: "Lightning Bolt",
            setCode: "2XM",
            rarity: "uncommon",
            manaCost: "R",
            image: "https://example.com/bolt.jpg",
            colorIdentity: ["R"],
          },
        },
      ],
      meta: {
        scope: "card",
        period: "daily",
        format: null,
        count: 1,
        fallback: true,
        hasDatabase: false,
        lastCalculatedAt: null,
        jobs: {
          telemetryRollup: null,
          trendingRefresh: null,
        },
      },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<TrendingRail />);

    expect(screen.getByText(/curated set of standouts/i)).toBeInTheDocument();
    expect(screen.getByText("Lightning Bolt")).toBeInTheDocument();
    expect(screen.getByText("12.5%")).toBeInTheDocument();
    expect(screen.getByText("36")).toBeInTheDocument();
    expect(screen.getByText(/showing curated fallback snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/supabase connection missing/i)).toBeInTheDocument();
  });

  it("shows live metrics messaging when Supabase data is present", () => {
    mockUseTrending.mockReturnValue({
      entries: [
        {
          rank: 2,
          scope: "card",
          period: "daily",
          subjectId: "card-456",
          trendScore: 6.1,
          components: { price_growth: "not-a-number" },
          calculatedAt: new Date().toISOString(),
          card: {
            id: "card-456",
            name: "Brainstorm",
            setCode: "CST",
            rarity: "common",
            manaCost: "U",
            image: null,
            colorIdentity: ["U"],
          },
        },
      ],
      meta: {
        scope: "card",
        period: "daily",
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
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<TrendingRail />);

    expect(screen.getByText(/brainstorm/i)).toBeInTheDocument();
    expect(screen.getByText("--")).toBeInTheDocument();
    expect(screen.getByText(/live supabase metrics/i)).toBeInTheDocument();
  });

  it("bridges to Card Bazaar and tracks telemetry", async () => {
    const user = userEvent.setup();
    mockUseTrending.mockReturnValue({
      entries: [
        {
          rank: 1,
          scope: "card",
          period: "daily",
          subjectId: "card-123",
          trendScore: 8.2,
          components: {},
          calculatedAt: new Date().toISOString(),
          card: {
            id: "card-123",
            name: "Lightning Bolt",
            setCode: "2XM",
            rarity: "uncommon",
            manaCost: "R",
            image: "https://example.com/bolt.jpg",
            colorIdentity: ["R"],
          },
        },
      ],
      meta: {
        scope: "card",
        period: "daily",
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
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    mockBridge.mockResolvedValue({ bridgeId: "bridge-99", missing: ["card-456"], ok: true });

    render(<TrendingRail />);

    await user.click(screen.getByRole("button", { name: /bridge to card bazaar/i }));

    expect(mockBridge).toHaveBeenCalledWith({
      type: "card",
      cardId: "card-123",
      name: "Lightning Bolt",
      setCode: "2XM",
    });
    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "card",
        subjectId: "card-123",
        destination: "card_bazaar",
        missingCount: 1,
        bridgeId: "bridge-99",
      })
    );
  });
});