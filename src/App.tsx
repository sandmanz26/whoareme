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
import { AdminPage } from "@/pages/AdminPage"
import { SignInPage } from "@/pages/SignInPage"
import { TermsPage } from "@/pages/TermsPage"
import { ContentPolicyPage } from "@/pages/ContentPolicyPage"
import { AccessibilityPage } from "@/pages/AccessibilityPage"
import { ReportModal } from "@/components/admin/ReportModal"
import type { Filters } from "@/components/home/FilterBar"
import { PEOPLE } from "@/data/people"
import { SEED_WORK } from "@/data/portfolios"
import { AccountProvider, useAccount } from "@/hooks/useAccount"
import { AdminProvider, useAdmin } from "@/hooks/useAdmin"
import { authorIndex, personFromAccount, withDerivedTopics } from "@/lib/authors"
import { countByCategory, countByRole, filterPeople } from "@/lib/filter"
import { filterWork, skillFacets } from "@/lib/workFilter"
import { moreFromAuthor, similarWork } from "@/lib/similar"
import { interceptLinkClicks, navigate, pageRootOf, useRoute } from "@/lib/router"
import { applyMeta, clamp } from "@/lib/head"
import { track } from "@/lib/analytics"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { roleById } from "@/data/taxonomy"
import { isRoleLive, type RoleId } from "@/data/taxonomy"
import type { Target } from "@/data/admin"

const NO_FILTERS: Filters = {
  role: [],
  topic: [],
  practice: [],
  model: [],
  experience: [],
  language: [],
  skills: [],
  query: "",
}

export default function App() {
  return (
    <AccountProvider>
      <AdminProvider>
        <Shell />
      </AdminProvider>
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
  const { isWorkHidden, isPersonSuspended } = useAdmin()

  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [joinOpen, setJoinOpen] = useState(false)
  const [reportOf, setReportOf] = useState<{ target: Target; label: string } | null>(null)

  // Real anchors, intercepted once, so links stay links for crawlers and
  // middle-clicks while still routing client-side.
  useEffect(() => interceptLinkClicks(), [])

  // Page changes start at the top; in-page anchors are left alone.
  useEffect(() => {
    if (page !== "home") window.scrollTo({ top: 0, behavior: "instant" })
  }, [page, route.path])

  const authors = useMemo(() => authorIndex(account), [account])

  // Unmoderated. The console needs to see what it has already withheld, and
  // the flag rules must run against the real corpus rather than the surviving
  // half of it - otherwise hiding an entry would silently clear its own flag.
  // Launch scope. Four crafts are open, so the directory contains four crafts:
  // announcing "Data & AI, coming soon" while Data entries sit on the grid
  // would say two different things at once. The entries themselves stay in the
  // fixtures, waiting for the craft to open.
  const rawWork = useMemo(
    () => [...publishedWork, ...SEED_WORK].filter((item) => isRoleLive(item.role)),
    [publishedWork],
  )

  // Once you have a profile you are in the directory like anyone else.
  const rawPeople = useMemo(() => {
    const base = account
      ? [personFromAccount(account, [...new Set(drafts.flatMap((draft) => draft.skills))]), ...PEOPLE]
      : PEOPLE
    // A person belongs to a topic because of what they shipped in it, which is
    // also the only way practice topics ever reach the people directory.
    return withDerivedTopics(base.filter((person) => isRoleLive(person.role)), rawWork)
  }, [account, drafts, rawWork])

  /**
   * The moderation overlay, applied once at the top.
   *
   * Suspending a person withholds their work too. A profile that is gone while
   * its case studies stay on the grid is not a suspension, it is a broken link
   * with extra steps.
   */
  const allWork = useMemo(
    () =>
      rawWork.filter(
        (item) => !isWorkHidden(item.id) && !isPersonSuspended(item.authorId),
      ),
    [rawWork, isWorkHidden, isPersonSuspended],
  )
  const allPeople = useMemo(
    () => rawPeople.filter((person) => !isPersonSuspended(person.id)),
    [rawPeople, isPersonSuspended],
  )

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

  // The craft grid toggles membership rather than replacing the selection, so
  // it behaves like the dropdown that shows the same facet.
  const handleRoleSelect = useCallback(
    (role: RoleId | null) => {
      if (role === null) return patchFilters({ role: [] })
      setFilters((current) => ({
        ...current,
        role: current.role.includes(role)
          ? current.role.filter((item) => item !== role)
          : [...current.role, role],
      }))
      scrollTo("work")
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

  const openReport = useCallback(
    (target: Target, label: string) => setReportOf({ target, label }),
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

  // Demand-side counters. Named steps only: no path log, no referrer, nothing
  // about who did it.
  useEffect(() => {
    if (page === "work" && currentWork) track("case_study_opened")
  }, [page, currentWork])
  useEffect(() => {
    if (page === "people" && currentPerson) track("profile_opened")
  }, [page, currentPerson])
  useEffect(() => {
    if (page === "panel" && route.segments[1] === "portfolio" && route.segments[2] === "new") {
      track("entry_opened")
    }
  }, [page, route.segments])

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

  /**
   * One place decides what the head says, keyed off what is on screen.
   *
   * Scattering this into each page would guarantee a page gets added without
   * it, and the failure is invisible: the page looks right and only a crawler
   * or a pasted link shows the problem.
   */
  useEffect(() => {
    if (page === "work" && currentWork) {
      const author = authors.get(currentWork.authorId)
      return applyMeta({
        title: author ? `${currentWork.title}, by ${author.name}` : currentWork.title,
        description: clamp(currentWork.summary || currentWork.problem),
        type: "article",
        image: currentWork.thumbnail,
      })
    }
    if (page === "people" && currentPerson) {
      return applyMeta({
        title: `${currentPerson.name}, ${roleById(currentPerson.role).label}`,
        description: clamp(
          currentPerson.bio ||
            `${currentPerson.title} at ${currentPerson.company}, ${currentPerson.location}. ${personWork.length} case studies.`,
        ),
        type: "profile",
        image: currentPerson.photo,
      })
    }

    const STATIC: Record<string, { title: string; description: string; noindex?: boolean }> = {
      work: {
        title: "Every case study in the directory",
        description:
          "Real work from designers, developers, product people and DevOps. Each entry states a problem, the decisions behind it, and what measurably changed.",
      },
      about: {
        title: "About",
        description:
          "Why a portfolio should be segmented by craft and evidenced by outcome, and the rules that make it hard to publish anything else.",
      },
      changelog: { title: "Changelog", description: "What changed, when, and why it was decided that way." },
      privacy: { title: "Privacy", description: "Where your data goes in this build: nowhere but your own browser." },
      terms: { title: "Terms", description: "What you agree to by publishing here, and the confidentiality risk this product creates." },
      "content-policy": {
        title: "Content policy",
        description: "What gets removed, what stays up, how to report something, and how to contest a decision.",
      },
      accessibility: {
        title: "Accessibility",
        description: "What works, what we have not tested, and the standard we are aiming at.",
      },
      signin: { title: "Sign in", description: "Back to your panel, your entries and your traffic.", noindex: true },
      reset: { title: "Set a new password", description: "Choose a new password for your profile.", noindex: true },
      panel: { title: "Your panel", description: "Your profile, your entries and your traffic.", noindex: true },
      admin: { title: "Moderation", description: "Review queue, entries, people and the audit log.", noindex: true },
      notFound: { title: "Page not found", description: "Nothing lives at that address.", noindex: true },
    }

    const meta = STATIC[page]
    // `home` intentionally falls through to the defaults in `applyMeta`.
    return applyMeta(meta ?? {})
  }, [page, currentWork, currentPerson, personWork.length, authors])

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
        links: [],
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

        {page === "admin" && <AdminPage route={route} allWork={rawWork} allPeople={rawPeople} />}

        {(page === "signin" || page === "reset") && (
          <SignInPage route={route} onSignUp={openJoin} />
        )}

        {page === "notFound" && <NotFoundPage path={route.path} />}

        {page === "about" && <AboutPage />}
        {page === "changelog" && <ChangelogPage />}
        {page === "privacy" && <PrivacyPage />}
        {page === "terms" && <TermsPage />}
        {page === "content-policy" && <ContentPolicyPage />}
        {page === "accessibility" && <AccessibilityPage />}

        {page === "people" && (
          <ProfilePage
            person={currentPerson}
            work={personWork}
            authors={authors}
            onProfileView={handleProfileView}
            onSkillClick={addSkillFilter}
            onReport={openReport}
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
              onReport={openReport}
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

      <ReportModal
        open={reportOf !== null}
        onClose={() => setReportOf(null)}
        target={reportOf?.target ?? null}
        label={reportOf?.label ?? ""}
      />
    </div>
  )
}
