import { CatalogSection } from "@/components/catalog-section";
import { DeckBuilderPreviewSection } from "@/components/deck-builder-preview";
import { HeroSection } from "@/components/hero";
import { NavigationBar } from "@/components/navigation";
import { TrendingRail } from "@/components/trending-rail";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--color-surface-primary)]">
      <NavigationBar />
      <main className="flex-1">
        <CatalogSection />
        <HeroSection />
        <TrendingRail />
        <DeckBuilderPreviewSection />
      </main>
      <footer className="border-t border-white/10 bg-[color:var(--color-neutral-100)]/70 py-6">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-2 px-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
          <span className="uppercase tracking-[3px]">
            Metablazt - Built in tandem with Card Bazaar
          </span>
          <span className="text-[11px]">
            Phase 0 & 1 roadmap: design system, static shell, Scryfall ingestion prep.
          </span>
        </div>
      </footer>
    </div>
  );
}