import { Close, Search } from "@/components/ui/Icon"
import { Combobox } from "@/components/ui/Combobox"
import {
  categoryById,
  INDUSTRY_CATEGORIES,
  PRACTICE_CATEGORIES,
  roleById,
  LIVE_ROLES,
} from "@/data/taxonomy"
import type { CategoryId, RoleId } from "@/data/taxonomy"
import { BUSINESS_MODELS, businessModelById, type BusinessModelId } from "@/data/businessModels"
import { EXPERIENCE_BANDS, experienceBandById, type ExperienceBandId } from "@/data/experience"
import { LANGUAGES } from "@/data/people"
import { cn } from "@/lib/utils"
import { useAdmin } from "@/hooks/useAdmin"
import { track } from "@/lib/analytics"

/**
 * Every facet is a list, and an empty list means "no opinion".
 *
 * Within one facet the values are OR-ed: picking Designer and Developer asks
 * for either, because they are alternatives a reader is weighing, not
 * requirements they are stacking. Across facets everything is AND-ed, so each
 * additional facet narrows. That is the standard faceted-search contract and
 * the only one where adding a second value cannot return fewer results than
 * the first did.
 */
export interface Filters {
  role: RoleId[]
  /** Where it shipped. Industries only; practices are their own control. */
  topic: CategoryId[]
  /** Discipline work with no revenue line of its own. Stored in the same
   *  `topics` array as an industry, filtered independently of it. */
  practice: CategoryId[]
  model: BusinessModelId[]
  /** Facets of the person, not the work. Applied to a case study through its
   *  author, so one bar narrows both surfaces the same way. */
  experience: ExperienceBandId[]
  language: string[]
  /** AND-ed rather than OR-ed: a skill list is a spec, not a shortlist. */
  skills: string[]
  query: string
}

interface FilterBarProps {
  filters: Filters
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
  resultCount: number
  resultNoun: string
  /** Skills present in the current result set, most common first. */
  skillOptions?: string[]
  /**
   * The home page runs two controls; the full index has room for all five.
   * Anything hidden here still appears in the active-filter row below, so a
   * choice made on the index is never invisible on the home page.
   */
  showAll?: boolean
}

interface Option {
  id: string
  label: string
}

/** Module-level so a re-render does not start a second timer. */
let queryTimer = 0

/**
 * Labelled control.
 *
 * The label is visible, not `sr-only`. With six controls in a grid, a bar of
 * identical pills whose only clue is their current value is unreadable: you
 * cannot tell that "Designer" is the craft filter and "ERP" is the industry
 * filter until you open both. The label costs one line and removes the guess.
 */
function Field({
  label,
  values,
  onChange,
  options,
  allLabel,
}: {
  label: string
  values: readonly string[]
  onChange: (values: string[]) => void
  options: ReadonlyArray<Option>
  allLabel: string
}) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`
  const active = values.length > 0

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-display text-[0.6875rem] font-medium tracking-[0.12em] text-muted uppercase"
      >
        {label}
      </label>
      <Combobox
        multiple
        id={id}
        values={values}
        onChange={onChange}
        emptyLabel={allLabel}
        options={options.map((option) => ({ value: option.id, label: option.label }))}
        className={cn(
          "h-11 rounded-pill border bg-card pr-3 pl-4",
          active ? "border-ink/70 bg-paper-2" : "border-ink/12 hover:border-ink/40",
        )}
      />
    </div>
  )
}

/** One removable summary of a set filter. */
function ActiveChip({
  label,
  value,
  onClear,
}: {
  label: string
  value: string
  onClear: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="group inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-pill border border-ink/15 bg-card py-1 pr-2 pl-3 transition-colors duration-200 hover:border-ink"
    >
      <span className="font-display text-[0.6875rem] font-medium tracking-wide text-muted uppercase">
        {label}
      </span>
      <span className="font-display text-xs font-semibold text-ink">{value}</span>
      <Close size={13} className="text-muted transition-colors duration-200 group-hover:text-ink" />
      <span className="sr-only">Remove this filter</span>
    </button>
  )
}

/**
 * One bar drives both the portfolio grid and the people list, so a choice made
 * in either place stays true everywhere on the page.
 *
 * Structure is search, then the facet controls, then a row summarising what is
 * currently on. That summary row earns its place as the controls multiply: it
 * is the only surface showing every active filter at once, including the ones
 * whose control this page does not render.
 */
export function FilterBar({
  filters,
  onChange,
  onReset,
  resultCount,
  resultNoun,
  skillOptions = [],
  showAll = false,
}: FilterBarProps) {
  const { isRoleDisabled } = useAdmin()
  // A craft withdrawn in the console stops being offered here too, or the two
  // browse surfaces would disagree about what exists.
  // Live crafts, minus anything a moderator has withdrawn.
  const offeredRoles = LIVE_ROLES.filter((role) => !isRoleDisabled(role.id))

  function changeFacet(patch: Partial<Filters>) {
    track("filter_used")
    onChange(patch)
  }

  // One chip per selected value, built from a table so a new facet cannot be
  // added to the bar and forgotten here.
  const facets: Array<{
    key: keyof Filters
    label: string
    values: readonly string[]
    display: (value: string) => string
  }> = [
    { key: "role", label: "Craft", values: filters.role, display: (v) => roleById(v as RoleId).label },
    {
      key: "topic",
      label: "Industry",
      values: filters.topic,
      display: (v) => categoryById(v as CategoryId).label,
    },
    {
      key: "practice",
      label: "Practice",
      values: filters.practice,
      display: (v) => categoryById(v as CategoryId).label,
    },
    {
      key: "model",
      label: "Model",
      values: filters.model,
      display: (v) => businessModelById(v as BusinessModelId)?.label ?? v,
    },
    {
      key: "experience",
      label: "Experience",
      values: filters.experience,
      display: (v) => experienceBandById(v as ExperienceBandId)?.label ?? v,
    },
    { key: "language", label: "Language", values: filters.language, display: (v) => v },
    { key: "skills", label: "Skill", values: filters.skills, display: (v) => v },
  ]

  const active = facets.flatMap((facet) =>
    facet.values.map((value) => ({
      key: `${facet.key}-${value}`,
      label: facet.label,
      value: facet.display(value),
      clear: () =>
        onChange({ [facet.key]: facet.values.filter((item) => item !== value) } as Partial<Filters>),
    })),
  )

  const dirty = active.length > 0 || filters.query.trim() !== ""

  /**
   * Counted once per burst, not per keystroke.
   *
   * A counter that ticks on every character answers "how fast do people type",
   * which nobody asked. Three seconds of quiet is close enough to "they
   * searched for something".
   */
  function onQueryChange(value: string) {
    onChange({ query: value })
    window.clearTimeout(queryTimer)
    if (value.trim()) queryTimer = window.setTimeout(() => track("search_used"), 3000)
  }

  function toggleSkill(skill: string) {
    onChange({
      skills: filters.skills.includes(skill)
        ? filters.skills.filter((item) => item !== skill)
        : [...filters.skills, skill],
    })
  }

  return (
    <div className="rounded-card border border-line bg-paper-2/50 p-4 sm:p-5">
      {/* Search leads: it is the only control that can answer a question the
          facets cannot phrase. */}
      <div className="relative">
        <Search
          size={17}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={filters.query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search work, skills, people, cities"
          aria-label="Search work, skills, people or cities"
          className="h-12 w-full rounded-pill border border-ink/15 bg-card pr-4 pl-11 text-sm text-ink transition-colors duration-200 placeholder:text-muted focus:border-ink focus:outline-none"
        />
      </div>

      <div
        className={cn("mt-4 grid gap-3", showAll ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}
      >
        <Field
          label="Craft"
          allLabel="Any craft"
          values={filters.role}
          onChange={(next) => changeFacet({ role: next as RoleId[] })}
          options={offeredRoles.map((role) => ({ id: role.id, label: role.label }))}
        />
        <Field
          label="Industry"
          allLabel="Any industry"
          values={filters.topic}
          onChange={(next) => changeFacet({ topic: next as CategoryId[] })}
          options={INDUSTRY_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))}
        />
        <Field
          label="Practice"
          allLabel="Any practice"
          values={filters.practice}
          onChange={(next) => changeFacet({ practice: next as CategoryId[] })}
          options={PRACTICE_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))}
        />

        {showAll && (
          <>
            <Field
              label="Business model"
              allLabel="Any model"
              values={filters.model}
              onChange={(next) => changeFacet({ model: next as BusinessModelId[] })}
              options={BUSINESS_MODELS.map((m) => ({ id: m.id, label: m.label }))}
            />
            <Field
              label="Experience"
              allLabel="Any experience"
              values={filters.experience}
              onChange={(next) => changeFacet({ experience: next as ExperienceBandId[] })}
              options={EXPERIENCE_BANDS.map((b) => ({ id: b.id, label: b.label }))}
            />
            <Field
              label="Language"
              allLabel="Any language"
              values={filters.language}
              onChange={(next) => changeFacet({ language: next })}
              options={LANGUAGES.map((l) => ({ id: l, label: l }))}
            />
          </>
        )}
      </div>

      {skillOptions.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-line pt-4">
          <span className="mr-1 font-display text-[0.6875rem] font-medium tracking-[0.12em] text-muted uppercase">
            Skills
          </span>
          {skillOptions.slice(0, 12).map((skill) => {
            const on = filters.skills.includes(skill)
            return (
              <button
                key={skill}
                type="button"
                aria-pressed={on}
                onClick={() => toggleSkill(skill)}
                className={cn(
                  "inline-flex min-h-9 cursor-pointer items-center rounded-pill border px-3 font-display text-xs font-medium",
                  "transition-all duration-200 ease-pop active:scale-[0.97]",
                  on
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/12 bg-card text-ink-2 hover:border-ink/40 hover:text-ink",
                )}
              >
                {skill}
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-4">
        <p className="font-display text-sm text-muted" role="status">
          <span className="font-semibold text-ink">{resultCount}</span> {resultNoun}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {active.map((item) => (
            <ActiveChip key={item.key} label={item.label} value={item.value} onClear={item.clear} />
          ))}
          {dirty && (
            <button
              type="button"
              onClick={onReset}
              className="ml-1 cursor-pointer font-display text-sm font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-200 hover:decoration-pop-pink"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
