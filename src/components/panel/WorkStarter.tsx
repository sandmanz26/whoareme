import { templatesFor } from "@/data/workTemplates"
import { LIVE_ROLES, roleById, type RoleId } from "@/data/taxonomy"
import type { WorkMode } from "@/data/account"
import { ArrowRight, Check } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"

const ACCENTS = ["bg-pop-lime", "bg-pop-pink", "bg-pop-violet", "bg-pop-sky", "bg-pop-tangerine"]

const MODES: Array<{ id: WorkMode; label: string; blurb: string; detail: string }> = [
  {
    id: "template",
    label: "Guided template",
    blurb: "Answer the questions your craft gets asked",
    detail:
      "Problem, approach, outcome, then the evidence fields for the craft you pick - latency and a repo for a developer, task success for a designer.",
  },
  {
    id: "custom",
    label: "Your own structure",
    blurb: "Your headings, your order",
    detail:
      "Write the sections yourself and add your own result rows. Better when the work does not fit a template - a long-running programme, a research body, a rebuild.",
  },
]

interface WorkStarterProps {
  mode: WorkMode
  role: RoleId | null
  profileRole: RoleId
  onModeChange: (mode: WorkMode) => void
  onRoleSelect: (role: RoleId) => void
  /** Picking a template is the last step and creates the draft. */
  onTemplateSelect: (role: RoleId, template: string) => void
}

/**
 * Two decisions before writing anything: how the entry is structured, and which
 * craft it belongs to. The craft is per entry, not per person - a designer who
 * shipped a router is allowed to file it as developer work.
 */
export function WorkStarter({
  mode,
  role,
  profileRole,
  onModeChange,
  onRoleSelect,
  onTemplateSelect,
}: WorkStarterProps) {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="display text-xl">How do you want to write it?</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {MODES.map((option) => {
            const active = mode === option.id
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => onModeChange(option.id)}
                className={cn(
                  "flex cursor-pointer flex-col gap-2 rounded-card border p-5 text-left transition-all duration-250 ease-pop",
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-card hover:-translate-y-0.5 hover:border-ink/35",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-base font-semibold tracking-tight">
                    {option.label}
                  </span>
                  {active && (
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-pop-lime text-ink">
                      <Check size={12} />
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "font-display text-xs font-medium",
                    active ? "text-pop-lime" : "text-ink-2",
                  )}
                >
                  {option.blurb}
                </span>
                <span className={cn("text-xs leading-relaxed", active ? "text-paper/65" : "text-muted")}>
                  {option.detail}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="display text-xl">Which craft is this work?</h2>
        <p className="mt-2 max-w-lg text-sm text-muted">
          It does not have to match your profile craft ({roleById(profileRole).label}) - file each
          entry where it actually belongs.
          {mode === "template"
            ? " The evidence questions come from this choice."
            : " It sets the cover motif and the role filter on the home page."}
        </p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {LIVE_ROLES.map((option, index) => {
            const active = role === option.id
            return (
              <li key={option.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onRoleSelect(option.id)}
                  className={cn(
                    "group relative flex h-full w-full cursor-pointer flex-col gap-2 overflow-hidden rounded-card border p-5 text-left",
                    "transition-all duration-250 ease-pop hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-26px_rgba(11,11,15,0.45)]",
                    active ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink/35",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -top-5 -right-5 size-14 rounded-full transition-transform duration-500 ease-pop group-hover:scale-[1.4]",
                      ACCENTS[index % ACCENTS.length],
                      active ? "opacity-100" : "opacity-70",
                    )}
                  />
                  <span className="relative flex items-center gap-2 font-display text-base font-semibold tracking-tight">
                    {option.label}
                    {option.id === profileRole && (
                      <span
                        className={cn(
                          "rounded-pill px-2 py-0.5 text-[0.625rem] font-medium",
                          active ? "bg-paper/15 text-paper" : "bg-paper-2 text-muted",
                        )}
                      >
                        your craft
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "relative text-xs leading-relaxed",
                      active ? "text-paper/70" : "text-muted",
                    )}
                  >
                    {mode === "template" ? templatesFor(option.id)[0]!.headline : option.blurb}
                  </span>
                  <span className="relative mt-2 inline-flex items-center gap-1 font-display text-xs font-semibold">
                    {mode === "template" ? "Choose a template" : "File it here"}
                    <ArrowRight
                      size={14}
                      className="transition-transform duration-250 ease-pop group-hover:translate-x-1"
                    />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Step three exists because a role tells you the vocabulary and not the
          shape of the work - and the shape decides which questions are worth
          asking. Only shown once a craft is chosen, so the page never presents
          two unanswered questions at once. */}
      {role && mode === "template" && (
        <section>
          <h2 className="display text-xl">What kind of {roleById(role).label.toLowerCase()} work?</h2>
          <p className="mt-2 max-w-lg text-sm text-muted">
            A shipped feature and a design system are both design, and almost nothing they should
            be asked about is the same. Pick the closest shape - you can change it later.
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {templatesFor(role).map((template, index) => (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => onTemplateSelect(role, template.id)}
                  className={cn(
                    "group relative flex h-full w-full cursor-pointer flex-col gap-2 overflow-hidden rounded-card border border-line bg-card p-5 text-left",
                    "transition-all duration-250 ease-pop hover:-translate-y-0.5 hover:border-ink/35",
                    "hover:shadow-[0_18px_40px_-26px_rgba(11,11,15,0.45)]",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -top-5 -right-5 size-14 rounded-full opacity-60 transition-transform duration-500 ease-pop group-hover:scale-[1.4]",
                      ACCENTS[index % ACCENTS.length],
                    )}
                  />
                  <span className="relative font-display text-base font-semibold tracking-tight">
                    {template.label}
                  </span>
                  <span className="relative text-xs text-muted">{template.blurb}</span>
                  <span className="relative mt-1 text-xs leading-relaxed text-ink-2">
                    {template.headline}
                  </span>
                  <span className="relative mt-2 inline-flex items-center gap-1 font-display text-xs font-semibold">
                    Start writing
                    <ArrowRight
                      size={14}
                      className="transition-transform duration-250 ease-pop group-hover:translate-x-1"
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
