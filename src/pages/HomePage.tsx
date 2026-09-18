import { Hero } from "@/components/home/Hero"
import { Marquee } from "@/components/home/Marquee"
import { RoleGrid } from "@/components/home/RoleGrid"
import { WorkBrowser } from "@/components/home/WorkBrowser"
import { Directory } from "@/components/home/Directory"
import { JoinCta } from "@/components/home/JoinCta"
import type { Filters } from "@/components/home/FilterBar"
import type { Person } from "@/data/people"
import type { Work } from "@/data/work"
import { isPracticeTopic } from "@/data/taxonomy"
import type { CategoryId, RoleId } from "@/data/taxonomy"
import type { Author } from "@/lib/authors"

interface HomePageProps {
  filters: Filters
  onFilterChange: (patch: Partial<Filters>) => void
  onResetFilters: () => void
  roleCounts: Record<RoleId, number>
  categoryCounts: Record<CategoryId, number>
  totalPeople: number
  people: Person[]
  work: Work[]
  skillFacets: string[]
  authors: Map<string, Author>
  onRoleSelect: (role: RoleId | null) => void
  onSearchSubmit: () => void
  onProfileView: (personId: string) => void
  onJoin: () => void
}

export function HomePage({
  filters,
  onFilterChange,
  onResetFilters,
  roleCounts,
  categoryCounts,
  totalPeople,
  people,
  work,
  skillFacets,
  authors,
  onRoleSelect,
  onSearchSubmit,
  onProfileView,
  onJoin,
}: HomePageProps) {
  return (
    <>
      <Hero
        query={filters.query}
        onQueryChange={(query) => onFilterChange({ query })}
        onSearchSubmit={onSearchSubmit}
        onJoin={onJoin}
      />

      <Marquee />

      <RoleGrid counts={roleCounts} activeRoles={filters.role} onSelect={onRoleSelect} />

      <WorkBrowser
        work={work}
        authors={authors}
        filters={filters}
        skillFacets={skillFacets}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
        onJoin={onJoin}
      />

      <Directory
        people={people}
        counts={categoryCounts}
        totalCount={totalPeople}
        activeCategories={[...filters.topic, ...filters.practice]}
        activeRoles={filters.role}
        query={filters.query}
        // One row of chips over two axes, so it routes by kind and toggles
        // membership - the same behaviour as the two dropdowns that show the
        // same values. The first chip clears both.
        onCategoryChange={(id) => {
          if (id === null) return onFilterChange({ topic: [], practice: [] })
          const key = isPracticeTopic(id) ? "practice" : "topic"
          const current = filters[key]
          onFilterChange({
            [key]: current.includes(id)
              ? current.filter((item) => item !== id)
              : [...current, id],
          } as Partial<Filters>)
        }}
        onResetFilters={onResetFilters}
        onProfileView={onProfileView}
        onJoin={onJoin}
      />

      <JoinCta onJoin={onJoin} />
    </>
  )
}
