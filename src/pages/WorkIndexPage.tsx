import { useMemo, useState } from "react"
import { Container } from "@/components/layout/Container"
import { FilterBar, type Filters } from "@/components/home/FilterBar"
import { WorkCard } from "@/components/work/WorkCard"
import { WorkCover } from "@/components/work/WorkCover"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { ArrowUpRight, Grid, Rows, Search } from "@/components/ui/Icon"
import { headlineProof, type Work } from "@/data/work"
import { categoryById, roleById } from "@/data/taxonomy"
import { businessModelById } from "@/data/businessModels"
import type { Author } from "@/lib/authors"
import { skillFacets } from "@/lib/workFilter"
import { navigate } from "@/lib/router"
import { cn } from "@/lib/utils"
import { useAdmin } from "@/hooks/useAdmin"

type Sort = "recent" | "title" | "role"
type Layout = "grid" | "list"

const SORTS: Array<{ id: Sort; label: string }> = [
  { id: "recent", label: "Most recent" },
  { id: "title", label: "A-Z" },
  { id: "role", label: "By craft" },
]

interface WorkIndexPageProps {
  work: Work[]
  totalCount: number
  authors: Map<string, Author>
  filters: Filters
  onFilterChange: (patch: Partial<Filters>) => void
  onResetFilters: () => void
  onJoin: () => void
}

/**
 * Every portfolio in one place. The home section is a curated slice; this is
 * the full index, with a denser list view for people who are scanning rather
 * than browsing.
 */
export function WorkIndexPage({
  work,
  totalCount,
  authors,
  filters,
  onFilterChange,
  onResetFilters,
  onJoin,
}: WorkIndexPageProps) {
  const { copy } = useAdmin()
  const [sort, setSort] = useState<Sort>("recent")
  const [layout, setLayout] = useState<Layout>("grid")

  const facets = useMemo(() => skillFacets(work), [work])
  const sorted = useMemo(() => {
    const copy = [...work]
    if (sort === "title") return copy.sort((a, b) => a.title.localeCompare(b.title))
    if (sort === "role")
      return copy.sort(
        (a, b) => roleById(a.role).label.localeCompare(roleById(b.role).label) || b.year - a.year,
      )
    return copy.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title))
  }, [work, sort])

  return (
    <div className="pb-24">
      <Container className="pt-10 pb-6">
        <p className="eyebrow">All portfolios</p>
        <h1 className="display mt-3 text-[clamp(2rem,5vw,3.25rem)]">
          Every case study <span className="text-muted">in the directory</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          {totalCount} entries from people who build technology. {copy("work.index.description")}
        </p>
      </Container>

      <Container>
        <FilterBar
          filters={filters}
          onChange={onFilterChange}
          onReset={onResetFilters}
          resultCount={work.length}
          resultNoun={work.length === 1 ? "case study" : "case studies"}
          skillOptions={facets}
          showAll
        />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-xs font-medium tracking-wide text-muted">Sort</span>
            {SORTS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={sort === option.id}
                onClick={() => setSort(option.id)}
                className={cn(
                  "cursor-pointer rounded-pill border px-3.5 py-1.5 font-display text-xs font-medium transition-colors duration-200",
                  sort === option.id
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/12 bg-card text-ink-2 hover:border-ink/40",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-pill border border-ink/12 bg-card p-1">
            {([
              { id: "grid" as const, icon: <Grid size={15} />, label: "Grid view" },
              { id: "list" as const, icon: <Rows size={15} />, label: "List view" },
            ]).map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={layout === option.id}
                aria-label={option.label}
                onClick={() => setLayout(option.id)}
                className={cn(
                  "grid size-9 cursor-pointer place-items-center rounded-pill transition-colors duration-200",
                  layout === option.id ? "bg-ink text-paper" : "text-muted hover:text-ink",
                )}
              >
                {option.icon}
              </button>
            ))}
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-card border border-dashed border-ink/20 bg-card px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-pill bg-paper-2 text-muted">
              <Search size={22} />
            </span>
            <h2 className="display mt-5 text-xl">Nothing matches</h2>
            <p className="mt-2 max-w-sm text-sm text-muted">
              Try widening the craft, topic or skills - or publish the first entry in this corner
              of the directory.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={onResetFilters}>
                Clear filters
              </Button>
              <Button onClick={onJoin}>Publish your work</Button>
            </div>
          </div>
        ) : layout === "grid" ? (
          <ul className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((item, index) => (
              <li key={item.id} className="flex min-w-0">
                <WorkCard
                  work={item}
                  author={authors.get(item.authorId)}
                  index={index}
                  onSkillClick={(skill) =>
                    onFilterChange({
                      skills: filters.skills.includes(skill)
                        ? filters.skills
                        : [...filters.skills, skill],
                    })
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {sorted.map((item) => (
              <li key={item.id}>
                <WorkRow work={item} author={authors.get(item.authorId)} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </div>
  )
}

function WorkRow({ work, author }: { work: Work; author?: Author }) {
  const headline = headlineProof(work)

  return (
    <button
      type="button"
      onClick={() => navigate(`/work/${work.id}`)}
      className="group flex w-full cursor-pointer flex-col gap-4 rounded-card border border-line bg-card p-4 text-left transition-all duration-250 ease-pop hover:-translate-y-0.5 hover:border-ink/30 sm:flex-row sm:items-center"
    >
      {work.thumbnail ? (
        <img
          src={work.thumbnail}
          alt=""
          className="aspect-[16/9] w-full shrink-0 rounded-xl border border-line object-cover sm:w-40"
        />
      ) : (
        <WorkCover
          seed={work.id}
          role={work.role}
          className="aspect-[16/9] w-full shrink-0 rounded-xl sm:w-40"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-ink/20 bg-paper-2">{roleById(work.role).label}</Badge>
          {work.topics.slice(0, 2).map((topic) => (
            <Badge key={topic}>{categoryById(topic).label}</Badge>
          ))}
          {work.model && (
            <Badge className="border-dashed">{businessModelById(work.model)?.label}</Badge>
          )}
          <span className="font-display text-xs text-muted">{work.year}</span>
        </div>
        <p className="mt-2 truncate font-display text-base font-semibold text-ink">{work.title}</p>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{work.summary}</p>
        {author && (
          <p className="mt-2 flex items-center gap-2 text-xs text-muted">
            <Avatar
              src={author.photo}
              name={author.name}
              className="size-5 rounded-full text-[0.5rem]"
            />
            <span className="truncate">
              {author.name} · {author.company}
            </span>
          </p>
        )}
      </div>

      {headline && (
        <div className="shrink-0 border-line sm:w-52 sm:border-l sm:pl-5">
          <p className="font-display text-[0.625rem] font-medium tracking-[0.14em] uppercase text-muted">
            {headline.label}
          </p>
          <p className="mt-1 font-display text-base leading-snug font-semibold text-ink">
            {headline.value}
          </p>
        </div>
      )}

      <ArrowUpRight
        size={18}
        className="hidden shrink-0 text-muted transition-colors duration-200 group-hover:text-ink sm:block"
      />
    </button>
  )
}
