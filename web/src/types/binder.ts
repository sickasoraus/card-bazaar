export const MAX_BINDERS = 5;
export const SLOTS_PER_BINDER = 100;
export const SLOTS_PER_SHEET = 9;

export type BinderCardOrigin = "card-bazaar" | "home-collection" | "auction";
export type BinderCardScanSource = "marketplace" | "user-upload" | "unscanned";

export type BinderCardVariant = {
  id: string;
  printingId: string;
  name: string;
  setCode: string;
  collectorNumber: string;
  finish: "nonfoil" | "foil" | "etched" | "gilded";
  quantity: number;
  condition: "mint" | "near-mint" | "lightly-played" | "played" | "poor";
  acquisition: {
    source: BinderCardOrigin;
    acquiredAt: string;
    costBasis: number | null;
  };
  pricing: {
    lastUpdated: string;
    currentValue: number;
    change24h: number;
    change7d: number;
  };
  scan?: {
    imageUrl: string;
    capturedAt: string;
    source: BinderCardScanSource;
  };
};

export type BinderSlot = {
  slotIndex: number;
  label?: string;
  variants: BinderCardVariant[];
};

export type BinderSheet = {
  id: string;
  index: number;
  slots: BinderSlot[];
};

export type BinderValuePoint = {
  timestamp: string;
  value: number;
};

export type Binder = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  focusTags: string[];
  hourlyChange: number;
  totalCards: number;
  totalValue: number;
  valueHistory: BinderValuePoint[];
  liquidityScore: number;
  sheets: BinderSheet[];
};

export type BinderBenchmark = {
  id: string;
  label: string;
  description: string;
  marketIndex: number;
  change24h: number;
  change7d: number;
  supplyIndex: number;
};

export type MyBinderState = {
  activeBinderId: string | null;
  binders: Binder[];
  benchmarks: BinderBenchmark[];
  lastSyncedAt: string | null;
  isSyncingPrices: boolean;
  pricingError: string | null;
};
