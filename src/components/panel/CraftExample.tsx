import { useMemo, useState } from "react"
import { SEED_WORK } from "@/data/portfolios"
import { proofOf } from "@/data/work"
import { roleById, type RoleId } from "@/data/taxonomy"
import { templateById } from "@/data/workTemplates"
import { ChevronDown } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"

const strong = (work: (typeof SEED_WORK)[number]) => Boolean(work.problem) && proofOf(work).length >= 2

/**
 * A worked example from the same craft, next to the empty form.
 *
 * The blank page is where first entries die, and the usual fix - prefilling
 * the form - would be actively wrong here: this product's entire value is that
 * a person answered the questions themselves, and a prefilled case study is
 * someone else's words one click from publication. So it sits alongside as a
 * reference, collapsed by default, and it is a real published entry rather
 * than a written-for-onboarding sample.
 *
 * Matched to what was actually picked, not just the craft. "What a strong
 * design system looks like" showing a flagship case study would be worse than
 * showing nothing - the shape of the evidence is the entire point of the
 * template someone just chose, and a mismatched example teaches the wrong
 * shape with the right label on it. The fallback chain only loosens the match
 * one dimension at a time: the same template, then the same shape of work in
 * any craft, then anything in the same craft, then nothing.
 */
export function CraftExample({
  role,
  templateId,
  templateLabel,
}: {
  role: RoleId
  templateId?: string
  templateLabel?: string
}) {
  const [open, setOpen] = useState(false)

  const example = useMemo(() => {
    const archetype = templateById(templateId)?.archetype
    return (
      SEED_WORK.find((work) => work.template === templateId && strong(work)) ??
      SEED_WORK.find((work) => work.template === templateId) ??
      (archetype &&
        (SEED_WORK.find((work) => templateById(work.template)?.archetype === archetype && strong(work)) ??
          SEED_WORK.find((work) => templateById(work.template)?.archetype === archetype))) ??
      SEED_WORK.find((work) => work.role === role && strong(work)) ??
      SEED_WORK.find((work) => work.role === role)
    )
  }, [role, templateId])

  if (!example) return null
  const proof = proofOf(example).slice(0, 2)

  return (
    <section className="rounded-card border border-dashed border-ink/20 bg-card">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 p-5 text-left"
      >
        <span className="min-w-0">
          <span className="block font-display text-sm font-semibold tracking-tight text-ink">
            What a strong {(templateLabel ?? roleById(role).label).toLowerCase()} looks like
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            A published example, for reference. Nothing is copied into your form.
          </span>
        </span>
        <ChevronDown
          size={18}
          className={cn("shrink-0 text-muted transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-line px-5 pt-5 pb-5">
          <p className="font-display text-sm font-semibold text-ink">{example.title}</p>
          <p className="mt-1 text-xs text-muted">{example.summary}</p>

          <dl className="mt-4 flex flex-col gap-3">
            {[
              { term: "The problem", detail: example.problem },
              { term: "What they did", detail: example.approach },
              { term: "What changed", detail: example.outcome },
            ]
              .filter((row) => row.detail)
              .map((row) => (
                <div key={row.term}>
                  <dt className="font-display text-[0.6875rem] font-medium tracking-[0.14em] text-muted uppercase">
                    {row.term}
                  </dt>
                  <dd className="mt-1 text-xs leading-relaxed text-ink-2">{row.detail}</dd>
                </div>
              ))}
          </dl>

          {proof.length > 0 && (
            <div className="mt-4 rounded-2xl bg-paper p-4">
              <p className="font-display text-[0.6875rem] font-medium tracking-[0.14em] text-muted uppercase">
                Results claimed
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {proof.map((detail) => (
                  <li key={detail.label} className="text-xs text-ink">
                    <span className="text-muted">{detail.label}:</span> {detail.value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-xs leading-relaxed text-muted">
            Notice what it does not do: no adjectives, no "leveraged", and the outcome names a
            number. Yours does not have to be a success - a cancelled project with an honest
            reason reads better than a vague win.
          </p>
        </div>
      )}
    </section>
  )
}
