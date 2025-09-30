import Link from "next/link";

const heroHighlights = [
  {
    title: "Auth bridge drafted",
    copy: "Card Bazaar OIDC flow defined with Supabase session hand-off and audit logging ready to wire up.",
  },
  {
    title: "Similarity metrics seeded",
    copy: "Phase 5 tables power stronger recommendations, upgrade suggestions, and trend rollups.",
  },
  {
    title: "Privacy controls online",
    copy: "Telemetry opt-out, export, and deletion requests land in Supabase for compliance tracking.",
  },
];

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative isolate overflow-hidden"
    >
      <div className="absolute inset-0 -z-10 opacity-70" aria-hidden>
        <div className="pointer-events-none absolute -top-32 right-[-10%] h-72 w-72 rounded-full bg-[color:var(--color-accent-end)] blur-[160px]" />
        <div className="pointer-events-none absolute bottom-[-20%] left-[-10%] h-80 w-80 rounded-full bg-[color:var(--color-accent-start)] blur-[180px]" />
      </div>
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-12 px-6 pb-10 pt-16 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex w-full flex-col gap-8 lg:w-1/2">
          <span className="text-xs font-semibold uppercase tracking-[6px] text-[color:var(--color-accent-highlight)]">
            Phase 5 Push
          </span>
          <h1 className="font-display text-4xl leading-tight text-[color:var(--color-text-hero)] sm:text-5xl lg:text-[56px]">
            Metablazt is primed for shared identity and smarter personalization.
          </h1>
          <p className="max-w-xl text-base text-subtle sm:text-lg">
            We now have the SSO bridge plan, Supabase similarity metrics, and privacy tooling in place. The Next.js shell
            stays static for GitHub Pages, while live data will light up once Vercel + Supabase go online.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/#cards"
              className="gradient-pill shadow-cta rounded-[var(--radius-pill)] px-6 py-3 text-sm font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition-transform hover:-translate-y-[2px]"
            >
              Browse Cards Preview
            </Link>
            <Link
              href="/#roadmap"
              className="text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-accent-highlight)] underline-offset-8 transition-colors hover:underline"
            >
              View Roadmap
            </Link>
          </div>
        </div>
        <div className="relative flex w-full justify-center lg:w-1/2">
          <div className="relative w-full max-w-[360px]">
            <div className="absolute left-6 top-[-40px] hidden h-24 w-24 rounded-full border border-white/10 bg-[color:var(--color-neutral-100)]/70 blur-[0px] lg:block" />
            <div className="relative flex flex-col gap-6">
              <HeroCard
                title="Identity Bridge"
                subtitle="Card Bazaar OAuth + Supabase alignment"
                tag="SSO"
                className="-rotate-3"
              />
              <HeroCard
                title="Trend Engine"
                subtitle="Daily card/deck metrics feeding recommendations"
                tag="Data"
                className="translate-x-8 rotate-2"
              />
              <HeroCard
                title="Privacy Center"
                subtitle="Opt-outs, exports, deletions wired into telemetry"
                tag="Trust"
                className="-translate-x-4"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1240px] px-6">
        <dl className="grid gap-6 rounded-[var(--radius-card)] border border-white/10 bg-[color:var(--color-neutral-100)]/60 p-6 backdrop-blur lg:grid-cols-3">
          {heroHighlights.map((item) => (
            <div key={item.title} className="flex flex-col gap-2">
              <dt className="text-sm font-semibold uppercase tracking-[3px] text-[color:var(--color-accent-highlight)]">
                {item.title}
              </dt>
              <dd className="text-sm text-subtle">{item.copy}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

type HeroCardProps = {
  title: string;
  subtitle: string;
  tag: string;
  className?: string;
};

function HeroCard({ title, subtitle, tag, className }: HeroCardProps) {
  return (
    <article
      className={`surface-card shadow-card rounded-[var(--radius-card)] border border-white/10 p-6 transition-transform duration-200 hover:-translate-y-1 ${className ?? ""}`}
    >
      <span className="inline-flex rounded-full border border-white/15 bg-[color:var(--color-neutral-300)]/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)]">
        {tag}
      </span>
      <h3 className="mt-4 font-display text-2xl text-[color:var(--color-text-hero)]">
        {title}
      </h3>
      <p className="mt-2 text-sm text-subtle">{subtitle}</p>
      <div className="mt-6 h-[200px] rounded-[12px] bg-[linear-gradient(145deg,var(--color-accent-start)_0%,var(--color-neutral-100)_100%)] opacity-70 ring-highlight" />
    </article>
  );
}
