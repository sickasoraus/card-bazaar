"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getBinderLimits, getDemoBinderState } from "@/services/binder-demo-data";
import { createEmptyBinder, recalculateBinderMetrics } from "@/services/binder-utils";
import { buildPricingKey, fetchPricesForRequests, type ScryfallPricingRequest } from "@/services/scryfall-pricing";
import type { Binder, BinderCardVariant, BinderBenchmark, BinderValuePoint, MyBinderState } from "@/types/binder";

const STORAGE_KEY = "card-bazaar-my-binder-v1";

const DEFAULT_STATE = getDemoBinderState();

export type BinderCreationResult = { success: true; binder: Binder } | { success: false; error: string };

type VariantCoordinate = {
  sheetIndex: number;
  slotIndex: number;
  variantIndex: number;
  variantId: string;
  variantName: string;
};

export type BinderStore = MyBinderState & {
  setActiveBinder: (id: string) => void;
  createBinder: (name: string, focusTags?: string[]) => BinderCreationResult;
  renameBinder: (id: string, name: string) => void;
  deleteBinder: (id: string) => void;
  upsertVariant: (payload: {
    binderId: string;
    sheetIndex: number;
    slotIndex: number;
    variant: BinderCardVariant;
  }) => void;
  removeVariant: (payload: { binderId: string; sheetIndex: number; slotIndex: number; variantId: string }) => void;
  updateVariantQuantity: (payload: {
    binderId: string;
    sheetIndex: number;
    slotIndex: number;
    variantId: string;
    quantity: number;
  }) => void;
  setBenchmarks: (benchmarks: BinderBenchmark[]) => void;
  recordValuationSnapshot: (payload: { binderId: string; value: number; timestamp?: string }) => void;
  syncBinderPricing: (binderId: string) => Promise<void>;
  resetToDemo: () => void;
};

export const useBinderStore = create<BinderStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      setActiveBinder: (id) => {
        if (!id) {
          return;
        }
        set({ activeBinderId: id });
      },
      createBinder: (rawName, focusTags = []) => {
        const name = rawName.trim();
        if (!name.length) {
          return { success: false, error: "Name is required." } as const;
        }

        const { binders } = get();
        const limits = getBinderLimits();
        if (binders.length >= limits.maxBinders) {
          return {
            success: false,
            error: `Limit reached: ${limits.maxBinders} binders allowed in beta.`,
          } as const;
        }

        const binder = createEmptyBinder(name, focusTags);
        set({
          binders: [...binders, binder],
          activeBinderId: binder.id,
        });
        return { success: true, binder } as const;
      },
      renameBinder: (id, rawName) => {
        const name = rawName.trim();
        if (!name.length) {
          return;
        }
        set((state) => ({
          binders: state.binders.map((binder) => (binder.id === id ? { ...binder, name, updatedAt: new Date().toISOString() } : binder)),
        }));
      },
      deleteBinder: (id) => {
        set((state) => {
          const filtered = state.binders.filter((binder) => binder.id !== id);
          return {
            binders: filtered,
            activeBinderId: filtered.length ? filtered[0].id : null,
          };
        });
      },
      upsertVariant: ({ binderId, sheetIndex, slotIndex, variant }) => {
        const { binders } = get();
        const binderIndex = binders.findIndex((entry) => entry.id === binderId);
        if (binderIndex < 0) {
          return;
        }
        const draft = structuredClone(binders[binderIndex]) as Binder;
        const sheet = draft.sheets[sheetIndex];
        if (!sheet) {
          return;
        }
        const slot = sheet.slots[slotIndex];
        if (!slot) {
          return;
        }
        const variants = [...slot.variants];
        const existingIndex = variants.findIndex((entry) => entry.id === variant.id);
        if (existingIndex >= 0) {
          variants[existingIndex] = variant;
        } else {
          variants.push(variant);
        }
        sheet.slots[slotIndex] = {
          ...slot,
          variants,
        };
        const updatedBinder = recalculateBinderMetrics(draft);
        const nextBinders = [...binders];
        nextBinders[binderIndex] = updatedBinder;
        set({
          binders: nextBinders,
          lastSyncedAt: new Date().toISOString(),
        });
      },
      removeVariant: ({ binderId, sheetIndex, slotIndex, variantId }) => {
        const { binders } = get();
        const binderIndex = binders.findIndex((entry) => entry.id === binderId);
        if (binderIndex < 0) {
          return;
        }
        const draft = structuredClone(binders[binderIndex]) as Binder;
        const sheet = draft.sheets[sheetIndex];
        if (!sheet) {
          return;
        }
        const slot = sheet.slots[slotIndex];
        if (!slot) {
          return;
        }
        sheet.slots[slotIndex] = {
          ...slot,
          variants: slot.variants.filter((entry) => entry.id !== variantId),
        };
        const updatedBinder = recalculateBinderMetrics(draft);
        const nextBinders = [...binders];
        nextBinders[binderIndex] = updatedBinder;
        set({
          binders: nextBinders,
          lastSyncedAt: new Date().toISOString(),
        });
      },
      updateVariantQuantity: ({ binderId, sheetIndex, slotIndex, variantId, quantity }) => {
        const { binders } = get();
        const binderIndex = binders.findIndex((entry) => entry.id === binderId);
        if (binderIndex < 0) {
          return;
        }
        const draft = structuredClone(binders[binderIndex]) as Binder;
        const sheet = draft.sheets[sheetIndex];
        if (!sheet) {
          return;
        }
        const slot = sheet.slots[slotIndex];
        if (!slot) {
          return;
        }
        const variants = slot.variants.map((entry) =>
          entry.id === variantId
            ? {
                ...entry,
                quantity: Math.max(0, quantity),
              }
            : entry,
        );
        sheet.slots[slotIndex] = {
          ...slot,
          variants,
        };
        const updatedBinder = recalculateBinderMetrics(draft);
        const nextBinders = [...binders];
        nextBinders[binderIndex] = updatedBinder;
        set({
          binders: nextBinders,
          lastSyncedAt: new Date().toISOString(),
        });
      },
      setBenchmarks: (benchmarks) => {
        set({ benchmarks });
      },
      recordValuationSnapshot: ({ binderId, value, timestamp }) => {
        set((state) => ({
          binders: state.binders.map((binder) => {
            if (binder.id !== binderId) {
              return binder;
            }
            const points: BinderValuePoint[] = [
              ...binder.valueHistory,
              {
                timestamp: timestamp ?? new Date().toISOString(),
                value: Math.round(value),
              },
            ];
            const history = points.slice(-48);
            const prior = history.length > 1 ? history[history.length - 2].value : value;
            const hourlyChange = prior ? Math.round(((value - prior) / prior) * 10000) / 100 : 0;
            return {
              ...binder,
              valueHistory: history,
              hourlyChange,
              totalValue: Math.round(value),
              updatedAt: timestamp ?? new Date().toISOString(),
            };
          }),
          lastSyncedAt: timestamp ?? new Date().toISOString(),
        }));
      },
      syncBinderPricing: async (binderId) => {
        const { binders, isSyncingPrices } = get();
        if (isSyncingPrices) {
          return;
        }

        const binderIndex = binders.findIndex((entry) => entry.id === binderId);
        if (binderIndex < 0) {
          set({ pricingError: "Binder not found." });
          return;
        }

        const binder = structuredClone(binders[binderIndex]) as Binder;
        const requestMap = new Map<string, ScryfallPricingRequest>();
        const variantMap = new Map<string, VariantCoordinate[]>();

        binder.sheets.forEach((sheet, sheetIndex) => {
          sheet.slots.forEach((slot, slotIndex) => {
            slot.variants.forEach((variant, variantIndex) => {
              if (!variant.setCode?.trim() || !variant.collectorNumber?.trim()) {
                return;
              }
              const request: ScryfallPricingRequest = {
                setCode: variant.setCode,
                collectorNumber: variant.collectorNumber,
                finish: variant.finish,
              };
              const key = buildPricingKey(request);
              if (!requestMap.has(key)) {
                requestMap.set(key, request);
              }
              const coords = variantMap.get(key) ?? [];
              coords.push({
                sheetIndex,
                slotIndex,
                variantIndex,
                variantId: variant.id,
                variantName: variant.name,
              });
              variantMap.set(key, coords);
            });
          });
        });

        if (!requestMap.size) {
          set({ pricingError: "Add cards with set + collector numbers to sync pricing." });
          return;
        }

        set({ isSyncingPrices: true, pricingError: null });

        try {
          const priceResults = await fetchPricesForRequests(Array.from(requestMap.values()));
          const now = new Date().toISOString();
          const errors: string[] = [];

          variantMap.forEach((coordinates, key) => {
            const priceResult = priceResults.get(key);
            coordinates.forEach((coordinate) => {
              const variant = binder.sheets[coordinate.sheetIndex]?.slots[coordinate.slotIndex]?.variants[coordinate.variantIndex];
              if (!variant) {
                return;
              }

              if (priceResult && priceResult.price !== null) {
                const previousValue = variant.pricing.currentValue;
                const changePercent = previousValue
                  ? Math.round((((priceResult.price - previousValue) / previousValue) * 100) * 100) / 100
                  : 0;

                variant.pricing = {
                  ...variant.pricing,
                  currentValue: priceResult.price,
                  change24h: changePercent,
                  lastUpdated: now,
                };
              } else {
                variant.pricing = {
                  ...variant.pricing,
                  lastUpdated: now,
                };
                if (priceResult?.error) {
                  errors.push(`${coordinate.variantName}: ${priceResult.error}`);
                }
              }
            });
          });

          const updatedBinder = recalculateBinderMetrics(binder);
          const nextBinders = [...binders];
          nextBinders[binderIndex] = updatedBinder;

          set({
            binders: nextBinders,
            lastSyncedAt: now,
            isSyncingPrices: false,
            pricingError: errors.length ? summariseErrors(errors) : null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown pricing error";
          set({
            isSyncingPrices: false,
            pricingError: message,
          });
        }
      },
      resetToDemo: () => {
        set(getDemoBinderState());
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        activeBinderId: state.activeBinderId,
        binders: state.binders,
        benchmarks: state.benchmarks,
        lastSyncedAt: state.lastSyncedAt,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        isSyncingPrices: false,
        pricingError: null,
      }),
    },
  ),
);

export function useActiveBinder(): Binder | null {
  return useBinderStore((state) => state.binders.find((binder) => binder.id === state.activeBinderId) ?? null);
}

export function useBinderBenchmarks(): BinderBenchmark[] {
  return useBinderStore((state) => state.benchmarks);
}

function summariseErrors(errors: string[]): string {
  if (!errors.length) {
    return "";
  }
  const unique = Array.from(new Set(errors));
  if (unique.length <= 3) {
    return unique.join(" - ");
  }
  const head = unique.slice(0, 3).join(" - ");
  const remaining = unique.length - 3;
  return `${head} - +${remaining} more`;
}
