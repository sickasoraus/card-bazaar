import { SLOTS_PER_BINDER, SLOTS_PER_SHEET, type Binder, type BinderSheet, type BinderSlot } from "@/types/binder";

export function createEmptySlots(): BinderSlot[] {
  return Array.from({ length: SLOTS_PER_SHEET }).map((_, index) => ({
    slotIndex: index,
    variants: [],
  }));
}

export function createEmptySheets(count?: number, startIndex = 0): BinderSheet[] {
  const total = count ?? Math.ceil(SLOTS_PER_BINDER / SLOTS_PER_SHEET);
  return Array.from({ length: total }).map((_, offset) => ({
    id: `sheet-${startIndex + offset + 1}`,
    index: startIndex + offset,
    slots: createEmptySlots(),
  }));
}

export function sumSlotQuantity(slot: BinderSlot): number {
  return slot.variants.reduce((total, variant) => total + Math.max(variant.quantity, 0), 0);
}

export function sumSlotValue(slot: BinderSlot): number {
  return slot.variants.reduce((total, variant) => {
    const perCard = Math.max(variant.pricing.currentValue, 0);
    return total + perCard * Math.max(variant.quantity, 0);
  }, 0);
}

export function recalculateBinderMetrics(binder: Binder): Binder {
  const totals = binder.sheets.reduce(
    (acc, sheet) => {
      sheet.slots.forEach((slot) => {
        acc.cards += sumSlotQuantity(slot);
        acc.value += sumSlotValue(slot);
      });
      return acc;
    },
    { cards: 0, value: 0 },
  );

  const history = appendValueHistory(binder.valueHistory, totals.value);
  const hourlyChange = computeHourlyChange(history);

  return {
    ...binder,
    totalCards: totals.cards,
    totalValue: Math.round(totals.value),
    valueHistory: history,
    hourlyChange,
    updatedAt: new Date().toISOString(),
  };
}

function appendValueHistory(history: Binder["valueHistory"], latestValue: number): Binder["valueHistory"] {
  const nextPoint = {
    timestamp: new Date().toISOString(),
    value: Math.round(latestValue),
  };

  const deduped = history.filter((point) => point.timestamp !== nextPoint.timestamp);
  const next = [...deduped, nextPoint];
  return next.slice(-48);
}

function computeHourlyChange(history: Binder["valueHistory"]): number {
  if (history.length < 2) {
    return 0;
  }
  const latest = history[history.length - 1]?.value ?? 0;
  const prior = history[Math.max(0, history.length - 2)]?.value ?? latest;
  if (!prior) {
    return 0;
  }
  const change = ((latest - prior) / prior) * 100;
  if (!Number.isFinite(change)) {
    return 0;
  }
  return Math.round(change * 100) / 100;
}

export function generateBinderId(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 32);
  const suffix = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${base || "binder"}-${suffix}`;
}

export function createEmptyBinder(name: string, focusTags: string[] = []): Binder {
  return recalculateBinderMetrics({
    id: generateBinderId(name),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    focusTags,
    hourlyChange: 0,
    totalCards: 0,
    totalValue: 0,
    valueHistory: [],
    liquidityScore: 0,
    sheets: createEmptySheets(),
  });
}
