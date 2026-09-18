import { Container } from "@/components/layout/Container"
import { SectionHeading } from "./SectionHeading"
import { ArrowUpRight } from "@/components/ui/Icon"
import { ROLES, type RoleId } from "@/data/taxonomy"
import { useAdmin } from "@/hooks/useAdmin"
import { cn, plural } from "@/lib/utils"

interface RoleGridProps {
  counts: Record<RoleId, number>
  /** Several crafts can be on at once; the grid toggles membership. */
  activeRoles: readonly RoleId[]
  onSelect: (role: RoleId | null) => void
}

/** Accent rotates through the pop palette so the grid reads as one system. */
const ACCENTS = ["bg-pop-lime", "bg-pop-pink", "bg-pop-violet", "bg-pop-sky", "bg-pop-tangerine"]

export function RoleGrid({ counts, activeRoles, onSelect }: RoleGridProps) {
  const { copy, isRoleDisabled } = useAdmin()
  /**
   * All eight crafts show. Four are open; four say when they arrive.
   *
   * Hiding the unreleased four would make the directory look like it only
   * believes in half the industry. Showing them as selectable would send a
   * reviewer to an empty room. Announcing them does the useful thing: it tells
   * a QA engineer this is being built for them, without pretending it already
   * is.
   *
   * A craft withdrawn by a moderator is different - that one disappears.
   */
  const offered = ROLES.filter((role) => !isRoleDisabled(role.id))

  return (
    <section id="roles" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <SectionHeading
          title={
            <>
              Who are you <span className="text-muted">looking for?</span>
            </>
          }
          description={copy("home.roles.description")}
          action={
            activeRoles.length > 0 && (
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="cursor-pointer rounded-pill border border-ink/15 px-4 py-2.5 font-display text-sm font-medium text-ink-2 transition-colors duration-200 hover:border-ink hover:text-ink"
              >
                {activeRoles.length === 1 ? "Clear filter" : `Clear ${activeRoles.length} crafts`}
              </button>
            )
          }
        />

        <ul className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
          {offered.map((role, index) => {
            const active = activeRoles.includes(role.id)
            const soon = role.status === "soon"
            return (
              <li key={role.id}>
                <button
                  type="button"
                  aria-pressed={soon ? undefined : active}
                  disabled={soon}
                  aria-label={soon ? `${role.label}, coming soon` : undefined}
                  onClick={() => onSelect(active ? null : role.id)}
                  className={cn(
                    "group relative flex h-full w-full flex-col justify-between gap-7 overflow-hidden",
                    "rounded-card border p-5 text-left transition-all duration-250 ease-pop",
                    soon && "cursor-default border-dashed border-ink/20 bg-paper-2/40 text-muted",
                    !soon &&
                      "cursor-pointer hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(11,11,15,0.4)]",
                    !soon &&
                      (active
                        ? "border-ink bg-ink text-paper"
                        : "border-line bg-card text-ink hover:border-ink/35"),
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -top-5 -right-5 size-14 rounded-full transition-transform duration-500 ease-pop group-hover:scale-[1.4]",
                      ACCENTS[index % ACCENTS.length],
                      soon ? "opacity-25" : active ? "opacity-100" : "opacity-70",
                    )}
                  />
                  <span className="relative flex items-start justify-between gap-2">
                    <span className="font-display text-lg font-semibold tracking-tight">
                      {role.label}
                    </span>
                    {soon && (
                      <span className="shrink-0 rounded-pill border border-ink/15 bg-card px-2 py-0.5 font-display text-[0.625rem] font-semibold tracking-wide text-ink-2 uppercase">
                        Soon
                      </span>
                    )}
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
                        {soon
                          ? "Opening next"
                          : plural(counts[role.id] ?? 0, "person", "people")}
                      </span>
                    </span>
                    {!soon && (
                      <ArrowUpRight
                        size={18}
                        className="shrink-0 translate-y-1 opacity-0 transition-all duration-250 ease-pop group-hover:translate-y-0 group-hover:opacity-100"
                      />
                    )}
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
