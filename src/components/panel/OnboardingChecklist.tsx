import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/Button"
import { ArrowRight, Check, Close } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"

export interface OnboardingStep {
  id: string
  label: string
  /** What this step buys the person, not what it asks of them. */
  payoff: string
  done: boolean
  action?: { label: string; href: string }
}

/**
 * The bridge from signup to a first published entry.
 *
 * That gap is where this product lives or dies: the forms are demanding on
 * purpose, and a demanding form with no visible finish line is just an exit.
 * Four decisions shape this:
 *
 * 1. **Signup counts as step one, already ticked.** Starting a checklist at
 *    zero reads as "here is a pile of work"; starting it part-done reads as
 *    "you have started", and people finish part-done things far more often.
 * 2. **Each step states the payoff, not the task.** "Be findable by the teams
 *    filtering for your craft" is a reason; "add 3 skills" is a chore.
 * 3. **One action at a time.** Only the first unfinished step gets a button,
 *    so there is never a choice about what to do next.
 * 4. **It can be dismissed**, and brought back from the overview. Nobody
 *    should be trapped in their own dashboard.
 */
export function OnboardingChecklist({
  steps,
  onDismiss,
  firstName,
}: {
  steps: OnboardingStep[]
  onDismiss: () => void
  firstName: string
}) {
  const navigate = useNavigate()
  const done = steps.filter((step) => step.done).length
  const percent = Math.round((done / steps.length) * 100)
  const complete = done === steps.length
  const next = steps.find((step) => !step.done)

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-card border p-6",
        complete ? "border-ink bg-ink text-paper" : "border-line bg-card",
      )}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Hide the getting-started checklist"
        className={cn(
          "absolute top-4 right-4 grid size-9 cursor-pointer place-items-center rounded-pill transition-colors duration-200",
          complete ? "text-paper/50 hover:bg-paper/10 hover:text-paper" : "text-muted hover:bg-paper hover:text-ink",
        )}
      >
        <Close size={16} />
      </button>

      <p className={cn("eyebrow", complete && "text-paper/50")}>
        {complete ? "All done" : "Getting started"}
      </p>
      <h2 className="display mt-2 pr-10 text-[clamp(1.25rem,3vw,1.75rem)]">
        {complete
          ? `You are live, ${firstName}`
          : `One published entry is the whole game, ${firstName}`}
      </h2>
      <p className={cn("mt-2 max-w-xl text-sm leading-relaxed", complete ? "text-paper/70" : "text-muted")}>
        {complete
          ? "Your profile and your first entry are published. Everything from here is refinement."
          : "A profile on its own is a business card. The teams browsing this directory are reading case studies, so the goal is one good entry - not a finished profile."}
      </p>

      <div className="mt-5 flex items-center gap-3">
        <div className={cn("h-1.5 flex-1 overflow-hidden rounded-pill", complete ? "bg-paper/20" : "bg-paper-2")}>
          <div
            className={cn(
              "h-full rounded-pill transition-[width] duration-700 ease-pop",
              complete ? "bg-pop-lime" : "bg-ink",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className={cn("font-display text-xs font-medium", complete ? "text-paper/70" : "text-muted")}>
          {done} of {steps.length}
        </span>
      </div>

      <ol className="mt-5 flex flex-col gap-3">
        {steps.map((step) => {
          const isNext = step.id === next?.id
          return (
            <li key={step.id} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                  step.done
                    ? "bg-pop-lime text-ink"
                    : complete
                      ? "border border-dashed border-paper/40"
                      : isNext
                        ? "border-2 border-ink"
                        : "border border-dashed border-ink/25",
                )}
              >
                {step.done && <Check size={12} />}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-display text-sm",
                    step.done
                      ? cn("font-medium", complete ? "text-paper/60" : "text-muted")
                      : cn("font-semibold", complete ? "text-paper" : "text-ink"),
                  )}
                >
                  {step.label}
                </p>
                {!step.done && (
                  <p className={cn("mt-0.5 text-xs leading-relaxed", complete ? "text-paper/60" : "text-muted")}>
                    {step.payoff}
                  </p>
                )}
              </div>

              {/* Only the next step gets a button - a checklist with four
                  calls to action is a menu, and a menu is a decision. */}
              {isNext && step.action && (
                <Button size="sm" className="shrink-0" onClick={() => navigate(step.action!.href)}>
                  {step.action.label}
                  <ArrowRight size={15} />
                </Button>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
