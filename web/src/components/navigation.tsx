import Link from "next/link";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/#cards", label: "Cards" },
  { href: "/#decks", label: "Decks" },
  { href: "/#trending", label: "Trending" },
  { href: "/#imports", label: "Imports" },
  { href: "/settings/privacy", label: "Privacy" },
] as const;

export function NavigationBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[color:var(--color-neutral-100)]/85 shadow-nav backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="font-display text-2xl uppercase text-[color:var(--color-text-hero)] tracking-[2px]">
            Metablazt
          </span>
          <span className="hidden rounded-full bg-[color:var(--color-neutral-300)]/40 px-3 py-1 text-[11px] font-semibold text-[color:var(--color-text-hero)] tracking-[1.5px] md:inline-flex">
            Phase 5
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-accent-highlight)] lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition-opacity hover:opacity-80">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/#sign-in"
            className="hidden rounded-[var(--radius-control)] border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] transition-colors hover:border-white/40 md:inline-flex"
          >
            Log In
          </Link>
          <Link
            href="/deckbuilder"
            className="gradient-pill shadow-cta rounded-[var(--radius-pill)] px-5 py-2 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition-transform hover:-translate-y-[2px]"
          >
            Launch Deckbuilder
          </Link>
        </div>
      </div>
    </header>
  );
}


