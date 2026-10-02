import { useEffect } from "react"
import { Hero } from "@/components/home/Hero"
import { Marquee } from "@/components/home/Marquee"
import { RoleGrid } from "@/components/home/RoleGrid"
import { WorkBrowser } from "@/components/home/WorkBrowser"
import { Directory } from "@/components/home/Directory"
import { JoinCta } from "@/components/home/JoinCta"
import { isPracticeTopic } from "@/data/taxonomy"
import { useBrowse } from "@/context/BrowseContext"
import { applyMeta } from "@/lib/head"

export function HomePage() {
  const {
    filters,
    patchFilters,
    resetFilters,
    roleCounts,
    categoryCounts,
    allPeople,
    people,
    work,
    facets,
    authors,
    handleRoleSelect,
    openJoin,
  } = useBrowse()

  useEffect(() => {
    // Home page falls through to defaults in applyMeta
    return applyMeta({})
  }, [])

  function scrollToWork() {
    document.getElementById("work")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      <Hero
        query={filters.query}
        onQueryChange={(query) => patchFilters({ query })}
        onSearchSubmit={scrollToWork}
        onJoin={openJoin}
      />

      <Marquee />

      <RoleGrid counts={roleCounts} activeRoles={filters.role} onSelect={handleRoleSelect} />

      <WorkBrowser
        work={work}
        authors={authors}
        filters={filters}
        skillFacets={facets}
        onFilterChange={patchFilters}
        onResetFilters={resetFilters}
        onJoin={openJoin}
      />

      <Directory
        people={people}
        counts={categoryCounts}
        totalCount={allPeople.length}
        activeCategories={[...filters.topic, ...filters.practice]}
        activeRoles={filters.role}
        query={filters.query}
        onCategoryChange={(id) => {
          if (id === null) return patchFilters({ topic: [], practice: [] })
          const key = isPracticeTopic(id) ? "practice" : "topic"
          const current = filters[key]
          patchFilters({
            [key]: current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
          } as Parameters<typeof patchFilters>[0])
        }}
        onResetFilters={resetFilters}
        onJoin={openJoin}
      />

      <JoinCta onJoin={openJoin} />
    </>
  )
}
