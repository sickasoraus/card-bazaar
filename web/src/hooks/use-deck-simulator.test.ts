import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDeckSimulator } from "./use-deck-simulator";

vi.mock("@/lib/telemetry", () => ({
  trackSimulatorAction: vi.fn(),
}));

function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
}

describe("useDeckSimulator", () => {
  const deckInput = {
    id: "deck-123",
    name: "Izzet Phoenix",
    cards: [
      { cardId: "card-a", name: "Consider", quantity: 4 },
      { cardId: "card-b", name: "Arclight Phoenix", quantity: 3 },
    ],
  };

  beforeEach(() => {
    const storage = createStorageMock();
    Object.defineProperty(window, "localStorage", {
      value: storage,
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: storage,
      configurable: true,
    });
    let counter = 0;
    Object.defineProperty(globalThis, "crypto", {
      value: {
        randomUUID: () => `uuid-${counter++}`,
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads a deck and populates the library", () => {
    const { result } = renderHook(() => useDeckSimulator());

    act(() => {
      result.current.loadDeck(deckInput);
    });

    expect(result.current.state.loaded).toBe(true);
    expect(result.current.state.library.length).toBe(7);
    expect(result.current.state.hand.length).toBe(0);
    expect(result.current.state.history[0]?.message).toContain("Loaded Izzet Phoenix");
  });

  it("draws cards into hand", () => {
    const { result } = renderHook(() => useDeckSimulator());

    act(() => {
      result.current.loadDeck(deckInput);
    });
    act(() => {
      result.current.drawCards(2);
    });

    expect(result.current.state.hand.length).toBe(2);
    expect(result.current.state.library.length).toBe(5);
  });

  it("applies mulligan logic", () => {
    const { result } = renderHook(() => useDeckSimulator());

    act(() => {
      result.current.loadDeck(deckInput);
      result.current.drawOpeningHand();
      result.current.mulligan();
    });

    expect(result.current.state.hand.length).toBe(6);
    expect(result.current.state.mulligans).toBe(1);
  });

  it("moves cards between zones", () => {
    const { result } = renderHook(() => useDeckSimulator());

    act(() => {
      result.current.loadDeck(deckInput);
      result.current.drawCards(1);
    });
    const card = result.current.state.hand[0];
    expect(card).toBeDefined();

    act(() => {
      result.current.moveCard(card.instanceId, "battlefield");
    });

    expect(result.current.state.hand).toHaveLength(0);
    expect(result.current.state.battlefield).toHaveLength(1);
    expect(result.current.state.battlefield[0]?.name).toBe(card.name);
  });

  it("resets session to shuffled deck", () => {
    const { result } = renderHook(() => useDeckSimulator());

    act(() => {
      result.current.loadDeck(deckInput);
      result.current.drawCards(4);
      result.current.resetSession();
    });

    expect(result.current.state.hand).toHaveLength(0);
    expect(result.current.state.library.length).toBe(7);
    expect(result.current.state.turn).toBe(1);
  });
});
