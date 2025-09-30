"use client";

import Image from "next/image";
import { useMemo } from "react";

type CardStackProps = {
  title: string;
  imageUrl?: string | null;
  subtitle?: string;
  topBadge?: string;
  className?: string;
  onClick?: () => void;
  footer?: string;
  disabled?: boolean;
};

const FALLBACK_GRADIENT = "bg-[linear-gradient(155deg,var(--color-accent-start)_0%,var(--color-accent-end)_100%)]";

export function CardStack({
  title,
  imageUrl,
  subtitle,
  topBadge,
  className,
  onClick,
  footer,
  disabled,
}: CardStackProps) {
  const artwork = useMemo(() => imageUrl ?? null, [imageUrl]);

  const content = (
    <div
      className={`surface-card relative flex h-full w-full flex-col overflow-hidden rounded-[16px] border border-[color:var(--color-neutral-200)]/50 bg-[color:var(--color-neutral-200)]/20 shadow-card transition-transform duration-150 hover:-translate-y-[2px] ${className ?? ""}`}
    >
      {topBadge ? (
        <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-[color:var(--color-neutral-100)]/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
          {topBadge}
        </div>
      ) : null}
      <div className="relative flex-1">
        {artwork ? (
          <Image
            src={artwork}
            alt={title}
            fill
            sizes="(max-width: 768px) 200px, 320px"
            className="object-cover"
            priority={false}
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-body)] ${FALLBACK_GRADIENT}`}>
            No Art
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 rounded-[16px] border border-black/10 shadow-[0_8px_30px_rgba(7,24,48,0.45)]"></div>
      </div>
      <div className="flex flex-col gap-1 border-t border-white/10 bg-[color:var(--color-neutral-100)]/70 px-4 py-3">
        <span className="font-display text-sm text-[color:var(--color-text-hero)]">{title}</span>
        {subtitle ? <span className="text-[11px] uppercase tracking-[2px] text-subtle">{subtitle}</span> : null}
      </div>
      {footer ? (
        <div className="border-t border-white/10 bg-[color:var(--color-neutral-200)]/60 px-4 py-2 text-[11px] text-subtle">
          {footer}
        </div>
      ) : null}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="w-full text-left"
        onClick={onClick}
        disabled={disabled}
      >
        {content}
      </button>
    );
  }

  return content;
}
