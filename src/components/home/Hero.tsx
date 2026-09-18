import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/Button"
import { ArrowRight, Search, Sparkle } from "@/components/ui/Icon"
import { OrbitRing } from "./OrbitRing"
import { PEOPLE } from "@/data/people"
import { SEED_WORK } from "@/data/portfolios"
import { isRoleLive } from "@/data/taxonomy"
import type { CSSVars } from "@/lib/css"

/**
 * Counted over the launch scope, not the whole fixture set.
 *
 * The badge used to read straight off `PEOPLE` and `SEED_WORK`, which claimed
 * 54 case studies while the index next to it listed 37. A number on the hero
 * that the very next screen contradicts is worse than no number.
 */
const LIVE_PEOPLE = PEOPLE.filter((person) => isRoleLive(person.role))
const LIVE_WORK = SEED_WORK.filter((work) => isRoleLive(work.role))
const LIVE_TOPICS = new Set(LIVE_WORK.flatMap((work) => work.topics))

const OUTER = LIVE_PEOPLE.slice(0, 8)
const INNER = LIVE_PEOPLE.slice(8, 13)

interface HeroProps {
  query: string
  onQueryChange: (value: string) => void
  onSearchSubmit: () => void
  onJoin: () => void
}

export function Hero({ query, onQueryChange, onSearchSubmit, onJoin }: HeroProps) {
  return (
    <section id="top" className="relative overflow-hidden pt-10 pb-20 sm:pt-16 sm:pb-28">
      {/* Soft pop wash behind the orbit - keeps the paper from reading flat. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-12%] left-1/2 -z-10 h-[70vw] w-[70vw] max-h-[720px] max-w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-pop-lime)_55%,transparent),color-mix(in_oklab,var(--color-pop-pink)_18%,transparent)_45%,transparent_70%)] blur-3xl"
      />

      <Container className="flex flex-col items-center">
        <p className="animate-fade-up mb-8 inline-flex items-center gap-2 rounded-pill border border-ink/10 bg-card px-4 py-2 font-display text-xs font-medium tracking-wide text-ink-2">
          <Sparkle size={14} className="text-pop-violet" />
          {LIVE_PEOPLE.length} people, {LIVE_WORK.length} case studies, {LIVE_TOPICS.size} topics
        </p>

        {/* ── The stage: heading at the centre, portraits revolving around it ── */}
        <div
          className="orbit-stage relative my-6 grid place-items-center sm:my-10"
          style={
            {
              "--stage": "clamp(17rem, 76vw, 42rem)",
              width: "var(--stage)",
              height: "var(--stage)",
            } as CSSVars
          }
        >
          {/* Dotted guides trace the two orbits. */}
          <div
            aria-hidden="true"
            className="absolute rounded-full border border-dashed border-ink/12"
            style={{ width: "100%", height: "100%" }}
          />
          <div
            aria-hidden="true"
            className="absolute rounded-full border border-dashed border-ink/10"
            style={{ width: "74%", height: "74%" }}
          />

          <OrbitRing people={OUTER} radiusRatio={0.5} slotRatio={0.13} durationSeconds={64} />
          <OrbitRing
            people={INNER}
            radiusRatio={0.37}
            slotRatio={0.085}
            durationSeconds={46}
            direction="ccw"
          />

          <h1 className="display relative z-10 text-center text-[clamp(2.5rem,11vw,7rem)]">
            <span className="block">who</span>
            <span className="block">are</span>
            <span className="block">
              you<span className="text-pop-pink">?</span>
            </span>
          </h1>
        </div>

        {/* The contrast, not the feature list. A visitor who has seen three
            portfolio sites this week needs one sentence telling them why this
            one is different, and the difference is that the entries are made
            to state an outcome. Kept under twenty words so the search field
            below it stays above the fold. */}
        <p className="animate-fade-up mt-14 max-w-xl sm:mt-20 text-center text-base leading-relaxed text-ink-2 sm:text-lg">
          Not a gallery of screenshots. Every entry states the problem, the decisions, and the
          number that changed.
        </p>

        {/* Search is the primary CTA for a directory - keep the friction near zero. */}
        <form
          className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            onSearchSubmit()
          }}
        >
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Try “design systems”, “Rust”, “Jakarta”…"
              aria-label="Search people, skills or cities"
              className="h-14 w-full rounded-pill border border-line bg-card pr-4 pl-11 text-sm text-ink transition-colors duration-200 placeholder:text-muted/70 focus:border-ink focus:outline-none"
            />
          </div>
          <Button type="submit" size="lg" className="shrink-0">
            Search
            <ArrowRight size={18} />
          </Button>
        </form>

        <button
          type="button"
          onClick={onJoin}
          className="mt-4 cursor-pointer px-2 py-2.5 font-display text-sm font-medium text-muted underline decoration-ink/20 underline-offset-4 transition-colors duration-200 hover:text-ink hover:decoration-pop-pink"
        >
          Or add yourself to the directory →
        </button>
      </Container>
    </section>
  )
}
