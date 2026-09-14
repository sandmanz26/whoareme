import { useMemo, useState } from "react"
import { Close, Plus } from "@/components/ui/Icon"
import { ALL_SKILLS, SKILL_SUGGESTIONS } from "@/data/skills"
import type { RoleId } from "@/data/taxonomy"
import { cn } from "@/lib/utils"

interface SkillPickerProps {
  role: RoleId
  value: string[]
  onChange: (skills: string[]) => void
  max?: number
  error?: string
}

/**
 * Free text with suggestions, not a closed list. Suggestions matter because the
 * home-page skill filter groups on exact strings - nudging people towards
 * "Design systems" rather than "design-systems" is the whole job here.
 */
export function SkillPicker({ role, value, onChange, max = 8, error }: SkillPickerProps) {
  const [draft, setDraft] = useState("")
  const full = value.length >= max

  const suggestions = useMemo(() => {
    const query = draft.trim().toLowerCase()
    const pool = query ? ALL_SKILLS : SKILL_SUGGESTIONS[role]
    return pool
      .filter((skill) => !value.includes(skill))
      .filter((skill) => (query ? skill.toLowerCase().includes(query) : true))
      .slice(0, 8)
  }, [draft, role, value])

  function add(skill: string) {
    const clean = skill.trim()
    if (!clean || value.includes(clean) || full) return
    onChange([...value, clean])
    setDraft("")
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-sm font-medium text-ink">Skills</p>
        <span className="text-xs text-muted">
          {value.length}/{max}
        </span>
      </div>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((skill) => (
            <li key={skill}>
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== skill))}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill bg-ink py-1.5 pr-2 pl-3 font-display text-xs font-medium text-paper transition-opacity duration-200 hover:opacity-80"
              >
                {skill}
                <Close size={13} />
                <span className="sr-only">Remove {skill}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          disabled={full}
          aria-label="Add a skill"
          placeholder={full ? `Maximum ${max} skills` : "Type a skill and press Enter"}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            // Stop Enter from submitting the whole portfolio form.
            event.preventDefault()
            add(draft)
          }}
          className="h-11 flex-1 rounded-2xl border border-line bg-card px-4 text-sm text-ink transition-colors duration-200 placeholder:text-muted/70 focus:border-ink focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={full || !draft.trim()}
          className="inline-flex cursor-pointer items-center gap-1 rounded-2xl border border-ink/15 px-4 font-display text-sm font-medium text-ink transition-colors duration-200 hover:border-ink disabled:opacity-40"
        >
          <Plus size={15} />
          Add
        </button>
      </div>

      {!full && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => add(skill)}
              className={cn(
                "cursor-pointer rounded-pill border border-dashed border-ink/25 px-3 py-1.5",
                "font-display text-xs font-medium text-muted transition-colors duration-200",
                "hover:border-ink hover:text-ink",
              )}
            >
              {skill}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted">
        Used by the skill filter on the home page. Pick the ones you would be happy to be
        interviewed on.
      </p>
      {error && (
        <p role="alert" className="text-xs font-medium text-pop-pink">
          {error}
        </p>
      )}
    </div>
  )
}
