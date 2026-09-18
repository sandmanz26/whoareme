import { Avatar } from "@/components/ui/Avatar"
import { Badge } from "@/components/ui/Badge"
import { ArrowUpRight, Pin } from "@/components/ui/Icon"
import type { Person } from "@/data/people"
import { roleById } from "@/data/taxonomy"
import type { CSSVars } from "@/lib/css"
import { navigate } from "@/lib/router"

interface TalentCardProps {
  person: Person
  /** Position in the grid, used to stagger the entrance animation. */
  index: number
  /** Reported so a person can see their own profile views in the panel. */
  onView: (personId: string) => void
}

export function TalentCard({ person, index, onView }: TalentCardProps) {
  // Counting the view and routing are one action from the reader's side, so
  // they stay one function rather than two things a caller can forget to pair.
  function open() {
    onView(person.id)
    navigate(`/people/${person.id}`)
  }

  return (
    <article
      className="animate-fade-up group relative flex w-full min-w-0 flex-col rounded-card border border-line bg-card p-5 transition-all duration-250 ease-pop hover:-translate-y-1 hover:border-ink/30 hover:shadow-[0_20px_50px_-28px_rgba(11,11,15,0.45)]"
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` } as CSSVars}
    >
      <div className="flex items-start gap-4">
        <Avatar
          src={person.photo}
          name={person.name}
          className="size-14 shrink-0 rounded-[30%] border border-ink/10 bg-paper-2"
        />

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold tracking-tight text-ink">
            {person.name}
          </h3>
          <p className="mt-0.5 truncate text-sm text-ink-2">{person.title}</p>
          <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-muted">
            <Pin size={13} className="shrink-0" />
            <span className="truncate">
              {person.company} · {person.location}
            </span>
          </p>
        </div>

        {person.open && (
          <span
            className="flex shrink-0 items-center gap-1.5 rounded-pill bg-pop-lime px-2.5 py-1 font-display text-[0.625rem] font-semibold tracking-wide text-ink"
            title="Open to new opportunities"
          >
            <span className="size-1.5 rounded-full bg-ink" />
            OPEN
          </span>
        )}
      </div>

      <ul className="mt-5 flex flex-wrap gap-1.5">
        <li>
          <Badge className="border-ink/20 bg-paper-2">{roleById(person.role).label}</Badge>
        </li>
        {person.skills.slice(0, 3).map((skill) => (
          <li key={skill}>
            <Badge>{skill}</Badge>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
        <span className="font-display text-xs font-medium tracking-wide text-muted">
          {person.years} yrs experience
        </span>
        <button
          type="button"
          onClick={open}
          className="inline-flex cursor-pointer items-center gap-1 font-display text-xs font-semibold tracking-wide text-ink transition-colors duration-200 group-hover:text-pop-violet"
        >
          {/* Stretched hit area: the whole card is the target, but the
              accessible name stays on this one control rather than being
              duplicated across the card's other text. */}
          <span className="absolute inset-0 rounded-card" />
          View profile
          <ArrowUpRight size={14} />
          <span className="sr-only">of {person.name}</span>
        </button>
      </div>
    </article>
  )
}
