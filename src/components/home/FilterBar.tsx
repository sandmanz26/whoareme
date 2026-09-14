import { ChevronDown, Close, Search } from "@/components/ui/Icon"
import { CATEGORY_GROUPS, categoryById, roleById, ROLES } from "@/data/taxonomy"
import type { CategoryId, RoleId } from "@/data/taxonomy"
import { BUSINESS_MODELS, businessModelById, type BusinessModelId } from "@/data/businessModels"
import { EXPERIENCE_BANDS, experienceBandById, type ExperienceBandId } from "@/data/experience"
import { LANGUAGES } from "@/data/people"
import { cn } from "@/lib/utils"

export interface Filters {
  role: RoleId | null
  topic: CategoryId | null
  /** Third axis, surfaced as a control only on the full index. */
  model: BusinessModelId | null
  /** Facets of the person, not the work. Applied to a case study through its
   *  author, so one bar narrows both surfaces the same way. */
  experience: ExperienceBandId | null
  language: string | null
  /** Refinement under the two primary axes - AND-ed, so each one narrows. */
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

/**
 * Labelled select.
 *
 * The label is visible, not `sr-only`. With five controls in a row, a bar of
 * identical pills whose only clue is their current value is unreadable: you
 * cannot tell that "Designer" is the craft filter and "ERP" is the topic
 * filter until you open both. The label costs one line and removes the guess.
 */
function Field({
  label,
  value,
  onChange,
  options,
  groups,
  allLabel,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options?: ReadonlyArray<Option>
  /** Rendered as `<optgroup>`s, for lists that mix kinds a reader would
   *  otherwise conflate: industries and practices. */
  groups?: ReadonlyArray<{ label: string; options: ReadonlyArray<Option> }>
  allLabel: string
}) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`
  const active = value !== ""

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-display text-[0.6875rem] font-medium tracking-[0.12em] text-muted uppercase"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "h-11 w-full cursor-pointer appearance-none rounded-pill border bg-card pr-9 pl-4",
            "font-display text-sm font-medium text-ink transition-colors duration-200",
            "focus:border-ink focus:outline-none",
            active ? "border-ink/70 bg-paper-2" : "border-ink/12 hover:border-ink/40",
          )}
        >
          <option value="">{allLabel}</option>
          {options?.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
          {groups?.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
        />
      </div>
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
  const active: Array<{ key: string; label: string; value: string; clear: () => void }> = []

  if (filters.role) {
    active.push({
      key: "role",
      label: "Craft",
      value: roleById(filters.role).label,
      clear: () => onChange({ role: null }),
    })
  }
  if (filters.topic) {
    active.push({
      key: "topic",
      label: "Topic",
      value: categoryById(filters.topic).label,
      clear: () => onChange({ topic: null }),
    })
  }
  if (filters.model) {
    active.push({
      key: "model",
      label: "Model",
      value: businessModelById(filters.model)?.label ?? filters.model,
      clear: () => onChange({ model: null }),
    })
  }
  if (filters.experience) {
    active.push({
      key: "experience",
      label: "Experience",
      value: experienceBandById(filters.experience)?.label ?? filters.experience,
      clear: () => onChange({ experience: null }),
    })
  }
  if (filters.language) {
    active.push({
      key: "language",
      label: "Language",
      value: filters.language,
      clear: () => onChange({ language: null }),
    })
  }
  for (const skill of filters.skills) {
    active.push({
      key: `skill-${skill}`,
      label: "Skill",
      value: skill,
      clear: () => onChange({ skills: filters.skills.filter((item) => item !== skill) }),
    })
  }

  const dirty = active.length > 0 || filters.query.trim() !== ""

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
          onChange={(event) => onChange({ query: event.target.value })}
          placeholder="Search work, skills, people, cities"
          aria-label="Search work, skills, people or cities"
          className="h-12 w-full rounded-pill border border-ink/15 bg-card pr-4 pl-11 text-sm text-ink transition-colors duration-200 placeholder:text-muted focus:border-ink focus:outline-none"
        />
      </div>

      <div
        className={cn("mt-4 grid gap-3", showAll ? "sm:grid-cols-2 lg:grid-cols-5" : "sm:grid-cols-2")}
      >
        <Field
          label="Craft"
          allLabel="Any craft"
          value={filters.role ?? ""}
          onChange={(value) => onChange({ role: (value || null) as RoleId | null })}
          options={ROLES.map((role) => ({ id: role.id, label: role.label }))}
        />
        <Field
          label="Topic"
          allLabel="Any topic"
          value={filters.topic ?? ""}
          onChange={(value) => onChange({ topic: (value || null) as CategoryId | null })}
          groups={CATEGORY_GROUPS.map((group) => ({
            label: group.label,
            options: group.options.map((category) => ({
              id: category.id,
              label: category.label,
            })),
          }))}
        />

        {showAll && (
          <>
            <Field
              label="Business model"
              allLabel="Any model"
              value={filters.model ?? ""}
              onChange={(value) => onChange({ model: (value || null) as BusinessModelId | null })}
              options={BUSINESS_MODELS.map((model) => ({ id: model.id, label: model.label }))}
            />
            <Field
              label="Experience"
              allLabel="Any experience"
              value={filters.experience ?? ""}
              onChange={(value) =>
                onChange({ experience: (value || null) as ExperienceBandId | null })
              }
              options={EXPERIENCE_BANDS.map((band) => ({ id: band.id, label: band.label }))}
            />
            <Field
              label="Language"
              allLabel="Any language"
              value={filters.language ?? ""}
              onChange={(value) => onChange({ language: value || null })}
              options={LANGUAGES.map((language) => ({ id: language, label: language }))}
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
