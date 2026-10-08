import { Reveal } from "@/components/work/Reveal"
import { WorkFigures } from "@/components/work/WorkFigures"
import type { WorkFigure } from "@/data/work"

export function Chapter({
  title,
  body,
  figures = [],
  delay = 0,
}: {
  title: string
  body: string
  figures?: readonly WorkFigure[]
  delay?: number
}) {
  if (!body.trim() && figures.length === 0) return null
  return (
    <Reveal delay={delay}>
      <section>
        <h2 className="display text-[clamp(1.25rem,2.4vw,1.625rem)]">{title}</h2>
        {body.trim() && <p className="mt-4 text-base leading-[1.75] text-ink-2">{body}</p>}
        <WorkFigures figures={figures} />
      </section>
    </Reveal>
  )
}
