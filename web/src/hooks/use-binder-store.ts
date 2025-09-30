"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getBinderLimits, getDemoBinderState } from "@/services/binder-demo-data";
import { createEmptyBinder, recalculateBinderMetrics } from "@/services/binder-utils";
import type { Binder, BinderCardVariant, BinderBenchmark, BinderValuePoint, MyBinderState } from "@/types/binder";

const STORAGE_KEY = "card-bazaar-my-binder-v1";

const DEFAULT_STATE = getDemoBinderState();

export type BinderCreationResult = { success: true; binder: Binder } | { success: false; error: string };

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
            const points: BinderValuePoint[] = [...binder.valueHistory, {
              timestamp: timestamp ?? new Date().toISOString(),
              value: Math.round(value),
            }];
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
