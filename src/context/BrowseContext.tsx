import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { PEOPLE } from "@/data/people"
import { SEED_WORK } from "@/data/portfolios"
import { useAccount } from "@/hooks/useAccount"
import { useAdmin } from "@/hooks/useAdmin"
import { authorIndex, personFromAccount, withDerivedTopics, type Author } from "@/lib/authors"
import { countByCategory, countByRole, filterPeople } from "@/lib/filter"
import { filterWork, skillFacets } from "@/lib/workFilter"
import { isRoleLive, type RoleId, type CategoryId } from "@/data/taxonomy"
import type { Filters } from "@/components/home/FilterBar"
import type { Work } from "@/data/work"
import type { Person } from "@/data/people"
import type { Target } from "@/data/admin"

export interface GuestAuthor {
  id: string
  name: string
  title: string
  company: string
  location: string
  role: RoleId
  years: number
  languages: string[]
  links: []
}

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

interface BrowseContextValue {
  allWork: Work[]
  allPeople: Person[]
  rawWork: Work[]
  rawPeople: Person[]
  authors: Map<string, Author>
  work: Work[]
  people: Person[]
  facets: string[]
  categoryCounts: Record<CategoryId, number>
  roleCounts: Record<RoleId, number>
  filters: Filters
  patchFilters: (patch: Partial<Filters>) => void
  resetFilters: () => void
  handleRoleSelect: (role: RoleId | null) => void
  addSkillFilter: (skill: string) => void
  openJoin: () => void
  openReport: (target: Target, label: string) => void
  trackProfileView: (viewedId: string) => void
  joinOpen: boolean
  closeJoin: () => void
  reportOf: { target: Target; label: string } | null
  closeReport: () => void
  viewerAuthor: Author | GuestAuthor
  trackWorkOpen: (id: string) => void
}

const BrowseContext = createContext<BrowseContextValue | null>(null)

export function useBrowse(): BrowseContextValue {
  const ctx = useContext(BrowseContext)
  if (!ctx) throw new Error("useBrowse must be used inside BrowseProvider")
  return ctx
}

function useBrowseState(): BrowseContextValue {
  const navigate = useNavigate()
  const { account, drafts, publishedWork, trackProfileView: trackView, trackWorkOpen } = useAccount()
  const { isWorkHidden, isPersonSuspended } = useAdmin()

  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [joinOpen, setJoinOpen] = useState(false)
  const [reportOf, setReportOf] = useState<{ target: Target; label: string } | null>(null)

  const authors = useMemo(() => authorIndex(account), [account])

  const rawWork = useMemo(
    () => [...publishedWork, ...SEED_WORK].filter((item) => isRoleLive(item.role)),
    [publishedWork],
  )

  const rawPeople = useMemo(() => {
    const base = account
      ? [personFromAccount(account, [...new Set(drafts.flatMap((d) => d.skills))]), ...PEOPLE]
      : PEOPLE
    return withDerivedTopics(base.filter((p) => isRoleLive(p.role)), rawWork)
  }, [account, drafts, rawWork])

  const allWork = useMemo(
    () => rawWork.filter((item) => !isWorkHidden(item.id) && !isPersonSuspended(item.authorId)),
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
    (patch: Partial<Filters>) => setFilters((cur) => ({ ...cur, ...patch })),
    [],
  )
  const resetFilters = useCallback(() => setFilters(NO_FILTERS), [])

  const handleRoleSelect = useCallback(
    (role: RoleId | null) => {
      if (role === null) return patchFilters({ role: [] })
      setFilters((cur) => ({
        ...cur,
        role: cur.role.includes(role)
          ? cur.role.filter((r) => r !== role)
          : [...cur.role, role],
      }))
      document.getElementById("work")?.scrollIntoView({ behavior: "smooth", block: "start" })
    },
    [patchFilters],
  )

  const addSkillFilter = useCallback(
    (skill: string) => {
      setFilters((cur) =>
        cur.skills.includes(skill) ? cur : { ...cur, skills: [...cur.skills, skill] },
      )
      navigate("/work")
    },
    [navigate],
  )

  const openJoin = useCallback(() => setJoinOpen(true), [])
  const closeJoin = useCallback(() => setJoinOpen(false), [])
  const openReport = useCallback(
    (target: Target, label: string) => setReportOf({ target, label }),
    [],
  )
  const closeReport = useCallback(() => setReportOf(null), [])

  const trackProfileView = useCallback(
    (viewedId: string) => {
      if (account && viewedId === account.id) trackView()
    },
    [account, trackView],
  )

  const viewerAuthor: Author | GuestAuthor = account
    ? (authors.get(account.id) ?? {
        id: account.id,
        name: account.name,
        title: account.title ?? "",
        company: "Independent",
        location: account.location ?? "",
        role: account.role,
        years: 0,
        languages: [],
        links: [],
      })
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

  return {
    allWork,
    allPeople,
    rawWork,
    rawPeople,
    authors,
    work,
    people,
    facets,
    categoryCounts,
    roleCounts,
    filters,
    patchFilters,
    resetFilters,
    handleRoleSelect,
    addSkillFilter,
    openJoin,
    openReport,
    trackProfileView,
    joinOpen,
    closeJoin,
    reportOf,
    closeReport,
    viewerAuthor,
    trackWorkOpen,
  }
}

export function BrowseProvider({ children }: { children: React.ReactNode }) {
  const value = useBrowseState()
  return <BrowseContext.Provider value={value}>{children}</BrowseContext.Provider>
}
