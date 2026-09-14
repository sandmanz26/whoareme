import { useCallback, useEffect, useMemo, useState } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { JoinModal } from "@/components/join/JoinModal"
import { HomePage } from "@/pages/HomePage"
import { WorkPage } from "@/pages/WorkPage"
import { WorkIndexPage } from "@/pages/WorkIndexPage"
import { PanelPage } from "@/pages/PanelPage"
import { ProfilePage } from "@/pages/ProfilePage"
import { AboutPage } from "@/pages/AboutPage"
import { ChangelogPage } from "@/pages/ChangelogPage"
import { PrivacyPage } from "@/pages/PrivacyPage"
import type { Filters } from "@/components/home/FilterBar"
import { PEOPLE } from "@/data/people"
import { SEED_WORK } from "@/data/portfolios"
import { AccountProvider, useAccount } from "@/hooks/useAccount"
import { authorIndex, personFromAccount, withDerivedTopics } from "@/lib/authors"
import { countByCategory, countByRole, filterPeople } from "@/lib/filter"
import { filterWork, skillFacets } from "@/lib/workFilter"
import { moreFromAuthor, similarWork } from "@/lib/similar"
import { navigate, pageRootOf, useRoute } from "@/lib/router"
import type { RoleId } from "@/data/taxonomy"

const NO_FILTERS: Filters = {
  role: null,
  topic: null,
  model: null,
  experience: null,
  language: null,
  skills: [],
  query: "",
}

export default function App() {
  return (
    <AccountProvider>
      <Shell />
    </AccountProvider>
  )
}

/**
 * Browse state lives here so the hero search, the craft grid, the portfolio
 * filters, the index page and the people rail all read from one place - pick a
 * craft anywhere and every surface agrees about it.
 */
function Shell() {
  const route = useRoute()
  const page = pageRootOf(route)
  const { account, drafts, publishedWork, trackProfileView, trackWorkOpen } = useAccount()

  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [joinOpen, setJoinOpen] = useState(false)

  // Page changes start at the top; in-page anchors are left alone.
  useEffect(() => {
    if (page !== "home") window.scrollTo({ top: 0, behavior: "instant" })
  }, [page, route.path])

  const authors = useMemo(() => authorIndex(account), [account])
  const allWork = useMemo(() => [...publishedWork, ...SEED_WORK], [publishedWork])

  // Once you have a profile you are in the directory like anyone else.
  const allPeople = useMemo(() => {
    const base = account
      ? [personFromAccount(account, [...new Set(drafts.flatMap((draft) => draft.skills))]), ...PEOPLE]
      : PEOPLE
    // A person belongs to a topic because of what they shipped in it, which is
    // also the only way practice topics ever reach the people directory.
    return withDerivedTopics(base, allWork)
  }, [account, drafts, allWork])

  const categoryCounts = useMemo(() => countByCategory(allPeople), [allPeople])
  const roleCounts = useMemo(() => countByRole(allPeople), [allPeople])

  const people = useMemo(() => filterPeople(allPeople, filters), [allPeople, filters])
  const work = useMemo(() => filterWork(allWork, filters, authors), [allWork, filters, authors])
  const facets = useMemo(() => skillFacets(work), [work])

  const patchFilters = useCallback(
    (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch })),
    [],
  )
  const resetFilters = useCallback(() => setFilters(NO_FILTERS), [])

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const handleRoleSelect = useCallback(
    (role: RoleId | null) => {
      patchFilters({ role })
      if (role) scrollTo("work")
    },
    [patchFilters, scrollTo],
  )

  const addSkillFilter = useCallback(
    (skill: string) => {
      setFilters((current) =>
        current.skills.includes(skill)
          ? current
          : { ...current, skills: [...current.skills, skill] },
      )
      navigate("/work")
    },
    [],
  )

  const openJoin = useCallback(() => setJoinOpen(true), [])
  const closeJoin = useCallback(() => setJoinOpen(false), [])

  // A profile shows everything that person has published, newest first -
  // unfiltered, because the browse filters answer a different question than
  // "what has this person done".
  const personId = page === "people" ? route.segments[1] : undefined
  const currentPerson = useMemo(
    () => (personId ? allPeople.find((item) => item.id === personId) : undefined),
    [allPeople, personId],
  )
  const personWork = useMemo(
    () =>
      personId
        ? allWork
            .filter((item) => item.authorId === personId)
            .slice()
            .sort((a, b) => b.year - a.year)
        : [],
    [allWork, personId],
  )

  const workId = page === "work" ? route.segments[1] : undefined
  const currentWork = useMemo(
    () => (workId ? allWork.find((item) => item.id === workId) : undefined),
    [allWork, workId],
  )

  // Opens only count for the signed-in person's own entries - this is their
  // analytics, not a global counter.
  useEffect(() => {
    if (!account || !currentWork || currentWork.authorId !== account.id) return
    trackWorkOpen(currentWork.id)
  }, [account, currentWork, trackWorkOpen])

  const handleProfileView = useCallback(
    (viewedId: string) => {
      if (account && viewedId === account.id) trackProfileView()
    },
    [account, trackProfileView],
  )

  // Landing on your own profile page counts as a view too, not just clicking
  // through from a card - otherwise the number depends on the route taken.
  useEffect(() => {
    if (!account || !currentPerson || currentPerson.id !== account.id) return
    trackProfileView()
  }, [account, currentPerson, trackProfileView])

  const moreByAuthor = useMemo(
    () => (currentWork ? moreFromAuthor(currentWork, allWork) : []),
    [allWork, currentWork],
  )
  const similar = useMemo(
    () => (currentWork ? similarWork(currentWork, allWork) : []),
    [allWork, currentWork],
  )

  const viewerAuthor = account
    ? authors.get(account.id)!
    : {
        id: "guest",
        name: "You",
        title: "",
        company: "",
        location: "",
        role: "design" as RoleId,
        years: 0,
        languages: [],
      }

  return (
    <div className="min-h-dvh overflow-x-hidden">
      <a
        href="#work"
        className="sr-only rounded-pill bg-ink px-4 py-2 text-paper focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to the work
      </a>

      <Navbar onJoin={openJoin} />

      <main>
        {page === "panel" && <PanelPage route={route} author={viewerAuthor} onJoin={openJoin} />}

        {page === "about" && <AboutPage />}
        {page === "changelog" && <ChangelogPage />}
        {page === "privacy" && <PrivacyPage />}

        {page === "people" && (
          <ProfilePage
            person={currentPerson}
            work={personWork}
            authors={authors}
            onProfileView={handleProfileView}
            onSkillClick={addSkillFilter}
          />
        )}

        {page === "work" &&
          (workId ? (
            <WorkPage
              work={currentWork}
              authors={authors}
              moreByAuthor={moreByAuthor}
              similar={similar}
              onSkillClick={addSkillFilter}
            />
          ) : (
            <WorkIndexPage
              work={work}
              totalCount={allWork.length}
              authors={authors}
              filters={filters}
              onFilterChange={patchFilters}
              onResetFilters={resetFilters}
              onJoin={openJoin}
            />
          ))}

        {page === "home" && (
          <HomePage
            filters={filters}
            onFilterChange={patchFilters}
            onResetFilters={resetFilters}
            roleCounts={roleCounts}
            categoryCounts={categoryCounts}
            totalPeople={allPeople.length}
            people={people}
            work={work}
            skillFacets={facets}
            authors={authors}
            onRoleSelect={handleRoleSelect}
            onSearchSubmit={() => scrollTo("work")}
            onProfileView={handleProfileView}
            onJoin={openJoin}
          />
        )}
      </main>

      <Footer />

      <JoinModal open={joinOpen} onClose={closeJoin} onOpenPanel={() => navigate("/panel")} />
    </div>
  )
}
