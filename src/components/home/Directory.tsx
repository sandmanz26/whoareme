import { useState } from "react"
import { Container } from "@/components/layout/Container"
import { SectionHeading } from "./SectionHeading"
import { TalentCard } from "./TalentCard"
import { Button } from "@/components/ui/Button"
import { Plus, Search } from "@/components/ui/Icon"
import {
  EXTRA_CATEGORIES,
  PRIMARY_CATEGORIES,
  categoryById,
  roleById,
  type CategoryId,
  type RoleId,
} from "@/data/taxonomy"
import type { Person } from "@/data/people"
import { cn } from "@/lib/utils"
import { useAdmin } from "@/hooks/useAdmin"

const PAGE_SIZE = 9

interface DirectoryProps {
  people: Person[]
  counts: Record<CategoryId, number>
  totalCount: number
  /** Both kinds, merged: the rail is one row over two axes. Empty means the
   *  first chip, "All topics", is the live one. */
  activeCategories: readonly CategoryId[]
  activeRoles: readonly RoleId[]
  query: string
  onCategoryChange: (category: CategoryId | null) => void
  onResetFilters: () => void
  onJoin: () => void
}

export function Directory({
  people,
  counts,
  totalCount,
  activeCategories,
  activeRoles,
  query,
  onCategoryChange,
  onResetFilters,
  onJoin,
}: DirectoryProps) {
  const { copy } = useAdmin()
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Reset pagination whenever the result set changes, without an effect.
  // Derived from the result set rather than from the individual filter props:
  // the directory is now narrowed by facets it is not passed (experience,
  // language), and enumerating them here would go stale the next time one is
  // added. If the results did not change, not resetting is the right answer.
  const signature = `${people.length}|${people[0]?.id ?? ""}|${query}`
  const [lastSignature, setLastSignature] = useState(signature)
  if (signature !== lastSignature) {
    setLastSignature(signature)
    setVisibleCount(PAGE_SIZE)
  }

  const categories = showAllCategories
    ? [...PRIMARY_CATEGORIES, ...EXTRA_CATEGORIES]
    : PRIMARY_CATEGORIES
  const visible = people.slice(0, visibleCount)
  const hasFilters = activeRoles.length > 0 || query.trim().length > 0

  return (
    <section
      id="directory"
      className="scroll-mt-24 border-t border-line bg-paper-2/60 py-20 sm:py-28"
    >
      <Container>
        <SectionHeading
          title={
            <>
              Browse by <span className="text-muted">category</span>
            </>
          }
          description={copy("home.directory.description")}
        />

        {/* ── Category rail ─────────────────────────────────────────── */}
        <div className="no-scrollbar mt-10 -mx-5 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <button
            type="button"
            aria-pressed={activeCategories.length === 0}
            onClick={() => onCategoryChange(null)}
            className={cn(
              "flex shrink-0 cursor-pointer items-center gap-2 rounded-pill border px-4 py-2.5",
              "font-display text-sm font-medium transition-all duration-200 ease-pop active:scale-[0.97]",
              activeCategories.length === 0
                ? "border-ink bg-ink text-paper"
                : "border-ink/12 bg-card text-ink-2 hover:border-ink/40 hover:text-ink",
            )}
          >
            All topics
            <span
              className={cn(
                "text-xs",
                activeCategories.length === 0 ? "text-paper/60" : "text-muted",
              )}
            >
              {totalCount}
            </span>
          </button>

          {categories.map((category) => {
            const active = activeCategories.includes(category.id)
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={active}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-2 rounded-pill border px-4 py-2.5",
                  "font-display text-sm font-medium transition-all duration-200 ease-pop active:scale-[0.97]",
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/12 bg-card text-ink-2 hover:border-ink/40 hover:text-ink",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("size-2 rounded-full", category.tint.split(" ")[0])}
                />
                {category.label}
                <span className={cn("text-xs", active ? "text-paper/60" : "text-muted")}>
                  {counts[category.id] ?? 0}
                </span>
              </button>
            )
          })}

          {!showAllCategories && (
            <button
              type="button"
              onClick={() => setShowAllCategories(true)}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-pill border border-dashed border-ink/25 px-4 py-2.5 font-display text-sm font-medium text-muted transition-colors duration-200 hover:border-ink hover:text-ink"
            >
              <Plus size={15} />
              See more
            </button>
          )}
        </div>

        {/* ── Active filter summary ─────────────────────────────────── */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted">
            <span className="font-display font-semibold text-ink">{people.length}</span>{" "}
            {people.length === 1 ? "person" : "people"} in{" "}
            <span className="font-display font-semibold text-ink">
              {activeCategories.length === 0
                ? "every topic"
                : activeCategories.map((id) => categoryById(id).label).join(" or ")}
            </span>
            {activeRoles.length > 0 && (
              <>
                {" "}
                · filtered to{" "}
                <span className="font-display font-semibold text-ink">
                  {activeRoles.map((id) => roleById(id).label).join(" or ")}
                </span>
              </>
            )}
            {query.trim() && (
              <>
                {" "}
                · matching “<span className="font-display font-semibold text-ink">{query}</span>”
              </>
            )}
          </p>

          {hasFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="cursor-pointer font-display text-sm font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-200 hover:decoration-pop-pink"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* ── Results ───────────────────────────────────────────────── */}
        {people.length > 0 ? (
          <>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((person, index) => (
                <li key={person.id} className="min-w-0">
                  <TalentCard person={person} index={index} />
                </li>
              ))}
            </ul>

            {visibleCount < people.length && (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                >
                  Show {Math.min(PAGE_SIZE, people.length - visibleCount)} more
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="mt-6 flex flex-col items-center rounded-card border border-dashed border-ink/20 bg-card px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-pill bg-paper-2 text-muted">
              <Search size={22} />
            </span>
            <h3 className="display mt-5 text-xl">Nobody here yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted">
              No profile matches this combination. Try another category, clear the filters - or be
              the first one listed here.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={onResetFilters}>
                Reset filters
              </Button>
              <Button onClick={onJoin}>Add your profile</Button>
            </div>
          </div>
        )}
      </Container>
    </section>
  )
}
