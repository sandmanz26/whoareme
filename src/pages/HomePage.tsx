import { Hero } from "@/components/home/Hero"
import { Marquee } from "@/components/home/Marquee"
import { RoleGrid } from "@/components/home/RoleGrid"
import { WorkBrowser } from "@/components/home/WorkBrowser"
import { Directory } from "@/components/home/Directory"
import { JoinCta } from "@/components/home/JoinCta"
import type { Filters } from "@/components/home/FilterBar"
import type { Person } from "@/data/people"
import type { Work } from "@/data/work"
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

      <RoleGrid counts={roleCounts} activeRole={filters.role} onSelect={onRoleSelect} />

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
        activeCategory={filters.topic}
        activeRole={filters.role}
        query={filters.query}
        onCategoryChange={(topic) => onFilterChange({ topic })}
        onResetFilters={onResetFilters}
        onProfileView={onProfileView}
        onJoin={onJoin}
      />

      <JoinCta onJoin={onJoin} />
    </>
  )
}
