import { Container } from "@/components/layout/Container"
import { SectionHeading } from "./SectionHeading"
import { ArrowUpRight } from "@/components/ui/Icon"
import { ROLES, type RoleId } from "@/data/taxonomy"
import { cn, plural } from "@/lib/utils"

interface RoleGridProps {
  counts: Record<RoleId, number>
  activeRole: RoleId | null
  onSelect: (role: RoleId | null) => void
}

/** Accent rotates through the pop palette so the grid reads as one system. */
const ACCENTS = ["bg-pop-lime", "bg-pop-pink", "bg-pop-violet", "bg-pop-sky", "bg-pop-tangerine"]

export function RoleGrid({ counts, activeRole, onSelect }: RoleGridProps) {
  return (
    <section id="roles" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <SectionHeading
          title={
            <>
              Who are you <span className="text-muted">looking for?</span>
            </>
          }
          description="Pick a craft to filter the directory. Every profile is tagged by what the person does, not by whatever their offer letter said."
          action={
            activeRole && (
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="cursor-pointer rounded-pill border border-ink/15 px-4 py-2.5 font-display text-sm font-medium text-ink-2 transition-colors duration-200 hover:border-ink hover:text-ink"
              >
                Clear filter
              </button>
            )
          }
        />

        <ul className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
          {ROLES.map((role, index) => {
            const active = activeRole === role.id
            return (
              <li key={role.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(active ? null : role.id)}
                  className={cn(
                    "group relative flex h-full w-full cursor-pointer flex-col justify-between gap-7 overflow-hidden",
                    "rounded-card border p-5 text-left transition-all duration-250 ease-pop",
                    "hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(11,11,15,0.4)]",
                    active
                      ? "border-ink bg-ink text-paper"
                      : "border-line bg-card text-ink hover:border-ink/35",
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
                  <span className="relative flex items-start justify-between gap-2">
                    <span className="font-display text-lg font-semibold tracking-tight">
                      {role.label}
                    </span>
                  </span>
                  <span className="relative flex items-end justify-between gap-2">
                    <span
                      className={cn(
                        "text-xs leading-snug",
                        active ? "text-paper/70" : "text-muted",
                      )}
                    >
                      {role.blurb}
                      <br />
                      <span className="font-display font-medium">
                        {plural(counts[role.id] ?? 0, "person", "people")}
                      </span>
                    </span>
                    <ArrowUpRight
                      size={18}
                      className="shrink-0 translate-y-1 opacity-0 transition-all duration-250 ease-pop group-hover:translate-y-0 group-hover:opacity-100"
                    />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </Container>
    </section>
  )
}
