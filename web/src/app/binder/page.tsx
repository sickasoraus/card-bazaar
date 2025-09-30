"use client";

import { useEffect, useMemo, useState } from "react";

import { Binder3DViewer } from "@/components/binder/binder-3d-viewer";
import { BinderSidebar } from "@/components/binder/binder-sidebar";
import { NavigationBar } from "@/components/navigation";
import { useActiveBinder, useBinderStore } from "@/hooks/use-binder-store";
import type { BinderSheet } from "@/types/binder";

export default function BinderPage() {
  const binder = useActiveBinder();
  const binders = useBinderStore((state) => state.binders);
  const upsertVariant = useBinderStore((state) => state.upsertVariant);
  const lastSyncedAt = useBinderStore((state) => state.lastSyncedAt);
  const syncBinderPricing = useBinderStore((state) => state.syncBinderPricing);
  const isSyncingPrices = useBinderStore((state) => state.isSyncingPrices);
  const pricingError = useBinderStore((state) => state.pricingError);
  const [sheetIndex, setSheetIndex] = useState(0);

  useEffect(() => {
    setSheetIndex(0);
  }, [binder?.id]);

  const sheet: BinderSheet | null = useMemo(() => {
    if (!binder) {
      return null;
    }
    return binder.sheets[sheetIndex] ?? binder.sheets[0] ?? null;
  }, [binder, sheetIndex]);

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--color-surface-primary)] text-[color:var(--color-text-body)]">
      <NavigationBar />
      <main className="flex-1">
        <section className="border-b border-white/10 bg-gradient-to-r from-[rgba(20,9,35,0.9)] via-[rgba(17,8,30,0.85)] to-[rgba(10,5,18,0.8)]">
          <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-6 py-10">
            <div className="flex flex-col gap-3">
              <p className="font-display text-sm uppercase tracking-[4px] text-[color:var(--color-accent-highlight)]">Card Bazaar // My Binder</p>
              <h1 className="font-display text-4xl text-[color:var(--color-text-hero)] sm:text-5xl">
                Handle your collection like it is in your hands.
              </h1>
              <p className="max-w-2xl text-sm text-white/70">
                Flip between nine-pocket sheets, sync live valuations, and launch listings to Auction (beta) without leaving your binder view.
                This MVP runs on demo data today—wire it into Supabase once the Card Bazaar bridge lands.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[11px] uppercase tracking-[3px] text-white/60">
              <span>Binders ready: {binders.length}</span>
              {binder ? <span>Active binder: {binder.name}</span> : null}
              <span>Hourly price sync prototype</span>
              {lastSyncedAt ? <span>Last sync {new Date(lastSyncedAt).toLocaleTimeString()}</span> : null}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1240px] px-6 py-10">
          {!binder || !sheet ? (
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-10 text-center">
              <h2 className="font-display text-3xl text-[color:var(--color-text-hero)]">No binder yet</h2>
              <p className="mt-2 text-sm text-white/70">
                Create your first binder to start tracking cards. This MVP seeds with demo data—sync it with Card Bazaar once the API is live.
              </p>
              <button
                type="button"
                onClick={() => {
                  const name = prompt("Name your binder", "First Binder");
                  if (!name) {
                    return;
                  }
                  const result = useBinderStore.getState().createBinder(name);
                  if (!result.success) {
                    alert(result.error);
                  }
                }}
                className="mt-6 rounded-[14px] border border-white/10 bg-[color:var(--color-accent-highlight)] px-5 py-3 text-sm font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)]"
              >
                Create Binder
              </button>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(320px,360px)_1fr]">
              <BinderSidebar
                binder={binder}
                sheetIndex={sheetIndex}
                onChangeSheet={setSheetIndex}
                onAddCard={({ slotIndex, variant }) =>
                  upsertVariant({ binderId: binder.id, sheetIndex, slotIndex, variant })
                }
                onSyncPricing={() => syncBinderPricing(binder.id)}
                isSyncingPricing={isSyncingPrices}
                lastSyncedAt={lastSyncedAt}
                pricingError={pricingError}
              />
              <div className="flex flex-col gap-6">
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[3px] text-[color:var(--color-accent-highlight)]">Sheet {sheetIndex + 1}</p>
                      <h2 className="font-display text-2xl text-[color:var(--color-text-hero)]">{sheetIndex + 1} of {binder.sheets.length}</h2>
                    </div>
                    <div className="rounded-[12px] border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[2px] text-white/70">
                      {sheet.slots.filter((slot) => slot.variants.length).length}/9 slots filled
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-white/70">
                    Hover a card to see the latest scan, acquisition story, and eligibility for Auction (beta). Page flips and animations are powered by Three.js so the binder feels like premium plastic sleeves.
                  </p>
                </div>
                <Binder3DViewer sheet={sheet} />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

