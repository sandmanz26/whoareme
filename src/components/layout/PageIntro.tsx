import type { ReactNode } from "react"
import { Container } from "./Container"

/**
 * The masthead the three standing pages share. Kept here rather than
 * duplicated three times so About, Changelog and Privacy cannot drift apart
 * typographically - they are read as a set.
 */
export function PageIntro({
  eyebrow,
  title,
  lede,
  meta,
}: {
  eyebrow: string
  title: string
  lede: string
  /** Small print under the lede - a date, a version, a caveat. */
  meta?: ReactNode
}) {
  return (
    <Container className="pt-14 pb-10 sm:pt-20">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-3 max-w-3xl text-[clamp(2.25rem,6vw,3.75rem)]">{title}</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{lede}</p>
      {meta && <p className="mt-5 text-xs text-muted">{meta}</p>}
    </Container>
  )
}

/** A readable measure for long-form body copy. */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <Container className="pb-24">
      <div className="flex max-w-2xl flex-col gap-10 border-t border-line pt-12">{children}</div>
    </Container>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="display text-2xl">{title}</h2>
      <div className="mt-4 flex flex-col gap-4 text-base leading-[1.75] text-ink-2">{children}</div>
    </section>
  )
}
