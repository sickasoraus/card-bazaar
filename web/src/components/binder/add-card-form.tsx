"use client";

import { FormEvent, useMemo, useState } from "react";

import { SLOTS_PER_SHEET, type BinderCardVariant } from "@/types/binder";

const FINISH_OPTIONS: BinderCardVariant["finish"][] = ["nonfoil", "foil", "etched", "gilded"];
const CONDITION_OPTIONS: BinderCardVariant["condition"][] = ["mint", "near-mint", "lightly-played", "played", "poor"];
const ACQUISITION_SOURCES: BinderCardVariant["acquisition"]["source"][] = ["card-bazaar", "home-collection", "auction"];

type AddCardFormProps = {
  sheetIndex: number;
  onAdd: (payload: { slotIndex: number; variant: BinderCardVariant }) => void;
};

export function AddCardForm({ sheetIndex, onAdd }: AddCardFormProps) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [setCode, setSetCode] = useState("CSTM");
  const [collectorNumber, setCollectorNumber] = useState("000");
  const [finish, setFinish] = useState<BinderCardVariant["finish"]>("nonfoil");
  const [condition, setCondition] = useState<BinderCardVariant["condition"]>("near-mint");
  const [source, setSource] = useState<BinderCardVariant["acquisition"]["source"]>("home-collection");
  const [quantity, setQuantity] = useState(1);
  const [value, setValue] = useState(50);
  const [slotIndex, setSlotIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotOptions = useMemo(() => Array.from({ length: SLOTS_PER_SHEET }).map((_, index) => ({
    value: index,
    label: `Slot ${index + 1}`,
  })), []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName.length) {
      setError("Card name is required.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    const now = new Date().toISOString();
    const safeQuantity = Math.max(1, quantity);
    const safeValue = Math.max(0, value);

    const variant: BinderCardVariant = {
      id: `custom-${now}-${Math.random().toString(36).slice(2, 8)}`,
      printingId: `${setCode}-${collectorNumber}-${finish}`,
      name: trimmedName,
      setCode: setCode.trim().toUpperCase() || "CSTM",
      collectorNumber: collectorNumber.trim() || "000",
      finish,
      quantity: safeQuantity,
      condition,
      acquisition: {
        source,
        acquiredAt: now,
        costBasis: safeValue * safeQuantity,
      },
      pricing: {
        lastUpdated: now,
        currentValue: safeValue,
        change24h: 0,
        change7d: 0,
      },
      scan: imageUrl.trim().length
        ? {
            imageUrl: imageUrl.trim(),
            capturedAt: now,
            source: source === "card-bazaar" ? "marketplace" : "user-upload",
          }
        : undefined,
    };

    onAdd({ slotIndex, variant });

    setName("");
    setImageUrl("");
    setQuantity(1);
    setValue(50);
    setSlotIndex(0);
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-[18px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[3px] text-[color:var(--color-accent-highlight)]">Quick Add</p>
          <h3 className="font-display text-lg text-[color:var(--color-text-hero)]">Add to Sheet {sheetIndex + 1}</h3>
        </div>
        <div className="rounded-[12px] bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[2px] text-white/70">
          9 slots
        </div>
      </div>
      {error ? <p className="rounded-[12px] bg-red-500/15 px-3 py-2 text-xs text-red-100">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
          Card name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="w-full rounded-[12px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/40"
            placeholder="Black Lotus"
          />
        </label>
        <label className="space-y-1 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
          Image URL (optional)
          <input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            className="w-full rounded-[12px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/40"
            placeholder="https://..."
          />
        </label>
        <label className="space-y-1 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
          Set code
          <input
            value={setCode}
            onChange={(event) => setSetCode(event.target.value.toUpperCase())}
            className="w-full rounded-[12px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/40"
          />
        </label>
        <label className="space-y-1 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
          Collector #
          <input
            value={collectorNumber}
            onChange={(event) => setCollectorNumber(event.target.value)}
            className="w-full rounded-[12px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/40"
          />
        </label>
        <label className="space-y-1 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
          Finish
          <select
            value={finish}
            onChange={(event) => setFinish(event.target.value as BinderCardVariant["finish"])}
            className="w-full rounded-[12px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/40"
          >
            {FINISH_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
          Condition
          <select
            value={condition}
            onChange={(event) => setCondition(event.target.value as BinderCardVariant["condition"])}
            className="w-full rounded-[12px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/40"
          >
            {CONDITION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
          Acquisition source
          <select
            value={source}
            onChange={(event) => setSource(event.target.value as BinderCardVariant["acquisition"]["source"])}
            className="w-full rounded-[12px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/40"
          >
            {ACQUISITION_SOURCES.map((option) => (
              <option key={option} value={option}>
                {option.replace("-", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
          Quantity
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value) || 1)}
            className="w-full rounded-[12px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/40"
          />
        </label>
        <label className="space-y-1 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
          Hourly value per card
          <input
            type="number"
            min={0}
            value={value}
            onChange={(event) => setValue(Number(event.target.value) || 0)}
            className="w-full rounded-[12px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/40"
          />
        </label>
        <label className="space-y-1 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
          Slot position
          <select
            value={slotIndex}
            onChange={(event) => setSlotIndex(Number(event.target.value))}
            className="w-full rounded-[12px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/40"
          >
            {slotOptions.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-[14px] border border-white/15 bg-[color:var(--color-accent-highlight)]/90 px-4 py-3 text-sm font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition hover:bg-[color:var(--color-accent-highlight)] disabled:opacity-60"
      >
        {isSubmitting ? "Adding..." : "Add to binder"}
      </button>
    </form>
  );
}
