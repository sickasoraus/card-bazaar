"use client";

import { useMemo, useState } from "react";

import { AddCardForm } from "@/components/binder/add-card-form";
import { useBinderBenchmarks, useBinderStore } from "@/hooks/use-binder-store";
import { SLOTS_PER_BINDER, type Binder } from "@/types/binder";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatPercent(value: number): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 2,
  });
  return formatter.format(value / 100);
}

type BinderSidebarProps = {
  binder: Binder;
  sheetIndex: number;
  onChangeSheet: (index: number) => void;
  onAddCard: (payload: { slotIndex: number; variant: Binder["sheets"][number]["slots"][number]["variants"][number] }) => void;
  onSyncPricing: () => void;
  isSyncingPricing: boolean;
  lastSyncedAt: string | null;
  pricingError: string | null;
};

export function BinderSidebar({
  binder,
  sheetIndex,
  onChangeSheet,
  onAddCard,
  onSyncPricing,
  isSyncingPricing,
  lastSyncedAt,
  pricingError,
}: BinderSidebarProps) {
  const binders = useBinderStore((state) => state.binders);
  const activeBinderId = useBinderStore((state) => state.activeBinderId);
  const setActiveBinder = useBinderStore((state) => state.setActiveBinder);
  const createBinder = useBinderStore((state) => state.createBinder);
  const renameBinder = useBinderStore((state) => state.renameBinder);
  const deleteBinder = useBinderStore((state) => state.deleteBinder);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(binder.name);
  const benchmarks = useBinderBenchmarks();

  const filledSlots = useMemo(() => {
    return binder.sheets.reduce((count, sheet) => count + sheet.slots.filter((slot) => slot.variants.length > 0).length, 0);
  }, [binder.sheets]);

  const fillProgress = Math.min(1, filledSlots / SLOTS_PER_BINDER);

  function handleCreateBinder() {
    const name = prompt("Name your new binder", `Binder ${binders.length + 1}`);
    if (!name) {
      return;
    }
    const result = createBinder(name);
    if (!result.success) {
      alert(result.error);
    }
  }

  function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed.length) {
      return;
    }
    renameBinder(binder.id, trimmed);
    setIsRenaming(false);
  }

  function handleDeleteBinder() {
    if (confirm(`Delete ${binder.name}? This cannot be undone.`)) {
      deleteBinder(binder.id);
    }
  }

  return (
    <aside className="flex w-full flex-col gap-5">
      <section className="rounded-[22px] border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[3px] text-[color:var(--color-accent-highlight)]">My Binders</p>
            {isRenaming ? (
              <form onSubmit={handleRename} className="mt-2 flex items-center gap-2">
                <input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  autoFocus
                  className="w-full rounded-[12px] border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/40"
                />
                <button type="submit" className="rounded-[12px] border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[2px] text-white/80">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRenaming(false);
                    setRenameValue(binder.name);
                  }}
                  className="rounded-[12px] border border-white/10 px-3 py-2 text-[11px] uppercase tracking-[2px] text-white/50"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <h2 className="mt-1 font-display text-3xl text-[color:var(--color-text-hero)]">{binder.name}</h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRenaming(true)}
              className="rounded-[12px] border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[2px] text-white/70 hover:border-white/40"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={handleDeleteBinder}
              className="rounded-[12px] border border-red-400/40 px-3 py-2 text-[11px] uppercase tracking-[2px] text-red-200 hover:border-red-400/70"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={handleCreateBinder}
              className="rounded-[12px] border border-white/15 bg-[color:var(--color-accent-highlight)]/90 px-3 py-2 text-[11px] font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)] hover:bg-[color:var(--color-accent-highlight)]"
            >
              New Binder
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSyncPricing}
            disabled={isSyncingPricing}
            className="rounded-[12px] border border-white/20 bg-black/25 px-4 py-2 text-[11px] font-semibold uppercase tracking-[2px] text-white/80 transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSyncingPricing ? "Syncing prices..." : "Sync hourly prices"}
          </button>
          {lastSyncedAt ? (
            <span className="text-[11px] uppercase tracking-[2px] text-white/60">
              Last sync {formatLastSynced(lastSyncedAt)}
            </span>
          ) : null}
        </div>
        {pricingError ? (
          <p className="mt-2 rounded-[12px] border border-red-400/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
            {pricingError}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {binders.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setActiveBinder(entry.id)}
              className={`rounded-[12px] border px-3 py-1 text-[11px] uppercase tracking-[2px] transition ${
                entry.id === activeBinderId
                  ? "border-[color:var(--color-accent-highlight)] bg-[color:var(--color-accent-highlight)]/20 text-[color:var(--color-text-hero)]"
                  : "border-white/10 text-white/60 hover:border-white/40"
              }`}
            >
              {entry.name}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[22px] border border-white/10 bg-white/5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard label="Total Value" value={formatCurrency(binder.totalValue)} trend={binder.hourlyChange} />
          <MetricCard label="Cards Logged" value={`${binder.totalCards}`} trend={filledSlots} trendSuffix=" slots" />
          <MetricCard label="Last Sync" value={formatLastSynced(lastSyncedAt ?? binder.updatedAt)} trendLabel="Hourly" />
          <MetricCard label="Liquidity Score" value={`${binder.liquidityScore}`} trendLabel="Auction ready" />
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[2px] text-white/60">
            <span>Binder completion</span>
            <span>{Math.round(fillProgress * 100)}%</span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[color:var(--color-accent-highlight)]" style={{ width: `${fillProgress * 100}%` }} />
          </div>
        </div>
        <div className="mt-6">
          <ValueSparkline points={binder.valueHistory} />
        </div>
      </section>

      <section className="rounded-[22px] border border-white/10 bg-white/5 p-5">
        <h3 className="font-display text-xl text-[color:var(--color-text-hero)]">Market Pulse</h3>
        <div className="mt-4 space-y-3">
          {benchmarks.map((benchmark) => (
            <div key={benchmark.id} className="rounded-[16px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[2px] text-[color:var(--color-accent-highlight)]">
                    {benchmark.label}
                  </p>
                  <p className="text-sm text-white/70">{benchmark.description}</p>
                </div>
                <div className="text-right text-sm text-white/80">
                  <p className="text-lg font-semibold text-white">{benchmark.marketIndex}</p>
                  <p className="text-[11px] text-white/50">Supply {benchmark.supplyIndex}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-[11px] uppercase tracking-[2px] text-white/70">
                <TrendBadge label="24h" value={benchmark.change24h} />
                <TrendBadge label="7d" value={benchmark.change7d} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <AddCardForm
        sheetIndex={sheetIndex}
        onAdd={({ slotIndex, variant }) => onAddCard({ slotIndex, variant })}
      />

      <section className="rounded-[22px] border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[3px] text-[color:var(--color-accent-highlight)]">Sheet Navigation</p>
            <h3 className="font-display text-xl text-[color:var(--color-text-hero)]">Sheet {sheetIndex + 1}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeSheet(Math.max(0, sheetIndex - 1))}
              disabled={sheetIndex === 0}
              className="rounded-[12px] border border-white/10 px-3 py-2 text-[11px] uppercase tracking-[2px] text-white/70 enabled:hover:border-white/40 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => onChangeSheet(Math.min(binder.sheets.length - 1, sheetIndex + 1))}
              disabled={sheetIndex === binder.sheets.length - 1}
              className="rounded-[12px] border border-white/10 px-3 py-2 text-[11px] uppercase tracking-[2px] text-white/70 enabled:hover:border-white/40 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-6 gap-2 text-center text-[10px] uppercase tracking-[2px] text-white/60">
          {binder.sheets.map((sheet, index) => (
            <button
              key={sheet.id}
              type="button"
              onClick={() => onChangeSheet(index)}
              className={`rounded-[10px] border px-2 py-1 transition ${
                index === sheetIndex ? "border-[color:var(--color-accent-highlight)] text-white" : "border-white/10 hover:border-white/40"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  trendSuffix?: string;
};

function MetricCard({ label, value, trend, trendLabel, trendSuffix }: MetricCardProps) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[2px] text-white/60">{label}</p>
      <p className="mt-2 font-display text-2xl text-white">{value}</p>
      {typeof trend === "number" ? (
        <p className={`mt-1 text-[11px] uppercase tracking-[2px] ${trend >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
          {trendLabel ? `${trendLabel}: ` : ""}
          {trendSuffix ? `${trend}${trendSuffix}` : formatPercent(trend)}
        </p>
      ) : trendLabel ? (
        <p className="mt-1 text-[11px] uppercase tracking-[2px] text-white/50">{trendLabel}</p>
      ) : null}
    </div>
  );
}

type ValueSparklineProps = {
  points: Binder["valueHistory"];
};

function ValueSparkline({ points }: ValueSparklineProps) {
  const path = useMemo(() => buildValuePath(points), [points]);
  const latest = points[points.length - 1]?.value ?? 0;
  const earliest = points[0]?.value ?? latest;
  const change = earliest ? ((latest - earliest) / earliest) * 100 : 0;

  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[2px] text-white/60">24h trajectory</p>
          <p className="font-display text-2xl text-white">{formatCurrency(latest)}</p>
        </div>
        <TrendBadge label="24h" value={change} />
      </div>
      <svg viewBox="0 0 240 80" className="mt-3 h-20 w-full">
        <defs>
          <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,187,0,0.45)" />
            <stop offset="100%" stopColor="rgba(255,187,0,0)" />
          </linearGradient>
        </defs>
        <path d={path.fill} fill="url(#spark-fill)" />
        <path d={path.stroke} stroke="rgba(255,227,255,0.95)" strokeWidth="2" fill="none" />
      </svg>
    </div>
  );
}

type TrendBadgeProps = {
  label: string;
  value: number;
};

function TrendBadge({ label, value }: TrendBadgeProps) {
  const formatted = `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[999px] px-2 py-1 text-[10px] uppercase tracking-[2px] ${
        value >= 0 ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"
      }`}
    >
      <span>{label}</span>
      <span>{formatted}</span>
    </span>
  );
}

function buildValuePath(points: Binder["valueHistory"]) {
  if (!points.length) {
    return { fill: "", stroke: "" };
  }
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = 240 / Math.max(points.length - 1, 1);

  const coords = points.map((point, index) => ({
    x: index * step,
    y: 80 - ((point.value - min) / range) * 70 - 5,
  }));

  const stroke = coords.reduce((acc, point, index) => {
    return acc + `${index === 0 ? "M" : "L"}${point.x},${point.y}`;
  }, "");

  const fill = `${stroke} L${coords[coords.length - 1]?.x ?? 240},80 L0,80 Z`;
  return { stroke, fill };
}

function formatLastSynced(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.valueOf())) {
      return "n/a";
    }
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "n/a";
  }
}

