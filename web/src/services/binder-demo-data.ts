import {
  MAX_BINDERS,
  SLOTS_PER_BINDER,
  SLOTS_PER_SHEET,
  type Binder,
  type BinderBenchmark,
  type BinderSheet,
  type MyBinderState,
} from "@/types/binder";
import {
  createEmptySheets,
  createEmptySlots,
  recalculateBinderMetrics,
  sumSlotQuantity,
  sumSlotValue,
} from "@/services/binder-utils";

const DEMO_SHEETS: BinderSheet[] = createDemoSheets();
const SEED_TOTAL_VALUE = Math.round(
  DEMO_SHEETS.reduce((sheetValue, sheet) => sheetValue + sheet.slots.reduce((slotValue, slot) => slotValue + sumSlotValue(slot), 0), 0),
);
const SEED_TOTAL_CARDS = DEMO_SHEETS.reduce((total, sheet) => total + sheet.slots.reduce((sum, slot) => sum + sumSlotQuantity(slot), 0), 0);

const DEMO_BINDERS: Binder[] = [
  recalculateBinderMetrics({
    id: "alpha-power",
    name: "Alpha Power Moves",
    createdAt: "2025-08-04T16:42:00.000Z",
    updatedAt: "2025-09-29T23:00:00.000Z",
    focusTags: ["power-nine", "reserved list", "auction-eligible"],
    hourlyChange: 2.45,
    totalCards: SEED_TOTAL_CARDS,
    totalValue: SEED_TOTAL_VALUE,
    valueHistory: buildValueHistory(SEED_TOTAL_VALUE),
    liquidityScore: 82,
    sheets: DEMO_SHEETS,
  }),
  recalculateBinderMetrics({
    id: "modern-play",
    name: "Modern Staples",
    createdAt: "2025-08-16T20:15:00.000Z",
    updatedAt: "2025-09-29T22:30:00.000Z",
    focusTags: ["modern", "fnm", "metagame"],
    hourlyChange: -0.6,
    totalCards: 0,
    totalValue: 0,
    valueHistory: buildValueHistory(17_940, { noise: 650 }),
    liquidityScore: 67,
    sheets: createEmptySheets(Math.ceil(SLOTS_PER_BINDER / SLOTS_PER_SHEET)),
  }),
];

const DEMO_BENCHMARKS: BinderBenchmark[] = [
  {
    id: "card-bazaar-index",
    label: "Card Bazaar Index",
    description: "Weighted basket of top 200 Card Bazaar transactions across the last 48 hours.",
    marketIndex: 131.4,
    change24h: 1.9,
    change7d: 5.6,
    supplyIndex: 72,
  },
  {
    id: "auction-liquidity",
    label: "Auction Liquidity",
    description: "Auction (beta) clearance rate vs. Card Kingdom and TCGplayer averages.",
    marketIndex: 94.2,
    change24h: -0.8,
    change7d: 2.3,
    supplyIndex: 65,
  },
  {
    id: "sealed-heat",
    label: "Sealed Heat Meter",
    description: "Sealed product velocity from 2013-2020 supplemental sets across major marketplaces.",
    marketIndex: 148.6,
    change24h: 0.4,
    change7d: 3.9,
    supplyIndex: 58,
  },
];

const DEMO_STATE: MyBinderState = {
  activeBinderId: DEMO_BINDERS[0]?.id ?? null,
  binders: DEMO_BINDERS,
  benchmarks: DEMO_BENCHMARKS,
  lastSyncedAt: "2025-09-29T23:00:00.000Z",
  isSyncingPrices: false,
  pricingError: null,
};

export function getDemoBinderState(): MyBinderState {
  return JSON.parse(JSON.stringify(DEMO_STATE));
}

export function getDemoBinderById(id: string): Binder | null {
  const state = getDemoBinderState();
  return state.binders.find((binder) => binder.id === id) ?? null;
}

export function getBinderLimits() {
  return {
    maxBinders: MAX_BINDERS,
    slotsPerBinder: SLOTS_PER_BINDER,
    slotsPerSheet: SLOTS_PER_SHEET,
  };
}

function createDemoSheets(): BinderSheet[] {
  const sheets: BinderSheet[] = [];

  const sheetOne: BinderSheet = {
    id: "sheet-1",
    index: 0,
    slots: createEmptySlots().map((slot, index) => {
      if (index === 0) {
        slot.variants.push({
          id: "black-lotus-alpha",
          printingId: "alpha-233",
          name: "Black Lotus",
          setCode: "LEA",
          collectorNumber: "233",
          finish: "gilded",
          quantity: 1,
          condition: "near-mint",
          acquisition: {
            source: "auction",
            acquiredAt: "2025-08-22T18:40:00.000Z",
            costBasis: 280000,
          },
          pricing: {
            lastUpdated: "2025-09-29T23:00:00.000Z",
            currentValue: 320000,
            change24h: 0.9,
            change7d: 4.5,
          },
          scan: {
            imageUrl: "https://cards.scryfall.io/png/front/0/3/03b04192-c847-4106-bd91-b6f0c0b2e258.png?1659595323",
            capturedAt: "2025-08-22T19:01:00.000Z",
            source: "marketplace",
          },
        });
      }
      if (index === 1) {
        slot.variants.push({
          id: "ancestral-recall-alpha",
          printingId: "alpha-35",
          name: "Ancestral Recall",
          setCode: "LEA",
          collectorNumber: "35",
          finish: "foil",
          quantity: 1,
          condition: "lightly-played",
          acquisition: {
            source: "card-bazaar",
            acquiredAt: "2025-08-12T12:04:00.000Z",
            costBasis: 21250,
          },
          pricing: {
            lastUpdated: "2025-09-29T23:00:00.000Z",
            currentValue: 23500,
            change24h: 1.2,
            change7d: 3.2,
          },
          scan: {
            imageUrl: "https://cards.scryfall.io/png/front/6/9/69ab9a0f-c017-4b23-8b3d-37482741d546.png?1659978290",
            capturedAt: "2025-08-12T12:20:00.000Z",
            source: "marketplace",
          },
        });
      }
      if (index === 2) {
        slot.variants.push({
          id: "mox-pearl-alpha",
          printingId: "alpha-234",
          name: "Mox Pearl",
          setCode: "LEA",
          collectorNumber: "234",
          finish: "etched",
          quantity: 1,
          condition: "near-mint",
          acquisition: {
            source: "home-collection",
            acquiredAt: "2019-02-14T20:00:00.000Z",
            costBasis: 0,
          },
          pricing: {
            lastUpdated: "2025-09-29T23:00:00.000Z",
            currentValue: 17500,
            change24h: 0.2,
            change7d: 1.4,
          },
          scan: {
            imageUrl: "https://cards.scryfall.io/png/front/a/7/a7a8cadf-e6c1-4a0a-9b5e-a65c4c2aaca8.png?1559591591",
            capturedAt: "2025-08-30T21:40:00.000Z",
            source: "user-upload",
          },
        });
      }
      if (index === 3) {
        slot.variants.push({
          id: "mox-emerald-alpha",
          printingId: "alpha-235",
          name: "Mox Emerald",
          setCode: "LEA",
          collectorNumber: "235",
          finish: "gilded",
          quantity: 1,
          condition: "near-mint",
          acquisition: {
            source: "auction",
            acquiredAt: "2025-09-04T02:10:00.000Z",
            costBasis: 19800,
          },
          pricing: {
            lastUpdated: "2025-09-29T23:00:00.000Z",
            currentValue: 22200,
            change24h: 0.4,
            change7d: 2.1,
          },
          scan: {
            imageUrl: "https://cards.scryfall.io/png/front/9/5/956b45eb-0f48-4a29-b97c-df5a79310282.png?1559591598",
            capturedAt: "2025-09-04T02:24:00.000Z",
            source: "marketplace",
          },
        });
      }
      if (index === 4) {
        slot.variants.push({
          id: "mox-ruby-alpha",
          printingId: "alpha-236",
          name: "Mox Ruby",
          setCode: "LEA",
          collectorNumber: "236",
          finish: "etched",
          quantity: 1,
          condition: "lightly-played",
          acquisition: {
            source: "card-bazaar",
            acquiredAt: "2025-09-12T16:33:00.000Z",
            costBasis: 20500,
          },
          pricing: {
            lastUpdated: "2025-09-29T23:00:00.000Z",
            currentValue: 21450,
            change24h: -0.2,
            change7d: 1.2,
          },
          scan: {
            imageUrl: "https://cards.scryfall.io/png/front/8/d/8d5cb918-fd86-4ff0-ab77-8c6c6fe7eb0a.png?1559591603",
            capturedAt: "2025-09-12T16:43:00.000Z",
            source: "marketplace",
          },
        });
      }
      return slot;
    }),
  };

  const sheetTwo: BinderSheet = {
    id: "sheet-2",
    index: 1,
    slots: createEmptySlots().map((slot, index) => {
      if (index === 0) {
        slot.variants.push({
          id: "timetwister-alpha",
          printingId: "alpha-255",
          name: "Timetwister",
          setCode: "LEA",
          collectorNumber: "255",
          finish: "foil",
          quantity: 1,
          condition: "near-mint",
          acquisition: {
            source: "card-bazaar",
            acquiredAt: "2025-09-08T09:18:00.000Z",
            costBasis: 17600,
          },
          pricing: {
            lastUpdated: "2025-09-29T23:00:00.000Z",
            currentValue: 18900,
            change24h: 0.6,
            change7d: 1.5,
          },
          scan: {
            imageUrl: "https://cards.scryfall.io/png/front/1/0/109093a4-b609-47e9-9836-74df316bed36.png?1559591608",
            capturedAt: "2025-09-08T09:35:00.000Z",
            source: "marketplace",
          },
        });
      }
      if (index === 3) {
        slot.variants.push({
          id: "time-walk-alpha",
          printingId: "alpha-254",
          name: "Time Walk",
          setCode: "LEA",
          collectorNumber: "254",
          finish: "foil",
          quantity: 1,
          condition: "near-mint",
          acquisition: {
            source: "auction",
            acquiredAt: "2025-09-01T03:55:00.000Z",
            costBasis: 31000,
          },
          pricing: {
            lastUpdated: "2025-09-29T23:00:00.000Z",
            currentValue: 33300,
            change24h: 0.8,
            change7d: 2.6,
          },
          scan: {
            imageUrl: "https://cards.scryfall.io/png/front/b/8/b8ff103a-f039-49a0-8253-8d944c898106.png?1559591616",
            capturedAt: "2025-09-01T04:04:00.000Z",
            source: "marketplace",
          },
        });
      }
      if (index === 4) {
        slot.variants.push({
          id: "mox-jet-alpha",
          printingId: "alpha-237",
          name: "Mox Jet",
          setCode: "LEA",
          collectorNumber: "237",
          finish: "etched",
          quantity: 1,
          condition: "near-mint",
          acquisition: {
            source: "card-bazaar",
            acquiredAt: "2025-08-28T10:50:00.000Z",
            costBasis: 22500,
          },
          pricing: {
            lastUpdated: "2025-09-29T23:00:00.000Z",
            currentValue: 23850,
            change24h: 0.3,
            change7d: 1.9,
          },
          scan: {
            imageUrl: "https://cards.scryfall.io/png/front/0/d/0d94b207-f94d-4fa7-bd57-df5d99413b17.png?1559591610",
            capturedAt: "2025-08-28T11:05:00.000Z",
            source: "marketplace",
          },
        });
      }
      return slot;
    }),
  };

  sheets.push(sheetOne, sheetTwo);

  const totalSheetsRequired = Math.ceil(SLOTS_PER_BINDER / SLOTS_PER_SHEET);
  const remaining = Math.max(totalSheetsRequired - sheets.length, 0);
  if (remaining > 0) {
    sheets.push(...createEmptySheets(remaining, sheets.length));
  }

  return sheets;
}

function buildValueHistory(currentValue: number, options: { length?: number; noise?: number } = {}): Binder["valueHistory"] {
  const length = options.length ?? 24;
  const noise = options.noise ?? Math.max(1000, currentValue * 0.01);
  const now = Date.now();

  return Array.from({ length }).map((_, index) => {
    const timestamp = new Date(now - (length - index - 1) * 60 * 60 * 1000);
    const phase = Math.sin(index / 4) * 0.015;
    const jitter = (Math.random() - 0.5) * 2 * noise;
    const value = Math.max(currentValue * (1 + phase) + jitter, currentValue * 0.7);
    return {
      timestamp: timestamp.toISOString(),
      value: Math.round(value),
    };
  });
}


