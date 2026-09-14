import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import type { Account, WorkDraft } from "@/data/account"
import { readJson, removeKey, writeJson } from "@/lib/storage"
import { workFromDraft } from "@/lib/workMapper"
import type { Work } from "@/data/work"
import {
  EMPTY_TRAFFIC,
  isoDay,
  recordProfileView,
  recordWorkOpen,
  type TrafficStore,
} from "@/data/traffic"
import { seedTraffic } from "@/data/trafficSeed"

const ACCOUNT_KEY = "account"
const DRAFTS_KEY = "drafts"
const TRAFFIC_KEY = "traffic"

interface AccountContextValue {
  account: Account | null
  drafts: WorkDraft[]
  /** Published entries, mapped into the shared Work model. */
  publishedWork: Work[]
  traffic: TrafficStore
  register: (account: Omit<Account, "id" | "createdAt">) => Account
  updateProfile: (patch: Partial<Account>) => void
  saveDraft: (draft: WorkDraft) => void
  deleteDraft: (id: string) => void
  trackProfileView: () => void
  trackWorkOpen: (workId: string) => void
  signOut: () => void
}

const AccountContext = createContext<AccountContextValue | null>(null)

/**
 * The whole "account" is a localStorage record. There is no backend by design,
 * so this is the seam a real API would slot into later - every component talks
 * to this hook rather than to storage.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(() => readJson<Account | null>(ACCOUNT_KEY, null))
  const [drafts, setDrafts] = useState<WorkDraft[]>(() => readJson<WorkDraft[]>(DRAFTS_KEY, []))
  const [traffic, setTraffic] = useState<TrafficStore>(() =>
    readJson<TrafficStore>(TRAFFIC_KEY, EMPTY_TRAFFIC),
  )

  const persistAccount = useCallback((next: Account | null) => {
    setAccount(next)
    if (next) writeJson(ACCOUNT_KEY, next)
    else removeKey(ACCOUNT_KEY)
  }, [])

  const persistDrafts = useCallback((next: WorkDraft[]) => {
    setDrafts(next)
    writeJson(DRAFTS_KEY, next)
  }, [])

  const register = useCallback<AccountContextValue["register"]>(
    (input) => {
      const next: Account = {
        ...input,
        id: `me-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
      }
      persistAccount(next)
      // A brand-new panel with three empty charts teaches nothing, so the
      // traffic view starts from a seeded history. It is labelled as such,
      // and real opens in this browser are counted on top of it.
      const seeded = seedTraffic(next.id)
      setTraffic(seeded)
      writeJson(TRAFFIC_KEY, seeded)
      return next
    },
    [persistAccount],
  )

  const updateProfile = useCallback<AccountContextValue["updateProfile"]>(
    (patch) => {
      setAccount((current) => {
        if (!current) return current
        const next = { ...current, ...patch }
        writeJson(ACCOUNT_KEY, next)
        return next
      })
    },
    [],
  )

  const saveDraft = useCallback<AccountContextValue["saveDraft"]>(
    (draft) => {
      setDrafts((current) => {
        const stamped = { ...draft, updatedAt: new Date().toISOString() }
        const exists = current.some((item) => item.id === stamped.id)
        const next = exists
          ? current.map((item) => (item.id === stamped.id ? stamped : item))
          : [stamped, ...current]
        writeJson(DRAFTS_KEY, next)
        return next
      })
    },
    [],
  )

  const deleteDraft = useCallback(
    (id: string) => {
      setDrafts((current) => {
        const next = current.filter((item) => item.id !== id)
        writeJson(DRAFTS_KEY, next)
        return next
      })
    },
    [],
  )

  const trackProfileView = useCallback(() => {
    setTraffic((current) => {
      const next = recordProfileView(current, isoDay(new Date()))
      writeJson(TRAFFIC_KEY, next)
      return next
    })
  }, [])

  const trackWorkOpen = useCallback((workId: string) => {
    setTraffic((current) => {
      const next = recordWorkOpen(current, isoDay(new Date()), workId)
      writeJson(TRAFFIC_KEY, next)
      return next
    })
  }, [])

  const signOut = useCallback(() => {
    persistAccount(null)
    persistDrafts([])
    setTraffic(EMPTY_TRAFFIC)
    removeKey(TRAFFIC_KEY)
  }, [persistAccount, persistDrafts])

  const publishedWork = useMemo(
    () => (account ? drafts.filter((d) => d.published).map((d) => workFromDraft(d, account)) : []),
    [drafts, account],
  )

  const value = useMemo<AccountContextValue>(
    () => ({
      account,
      drafts,
      publishedWork,
      traffic,
      register,
      updateProfile,
      saveDraft,
      deleteDraft,
      trackProfileView,
      trackWorkOpen,
      signOut,
    }),
    [
      account,
      drafts,
      publishedWork,
      traffic,
      register,
      updateProfile,
      saveDraft,
      deleteDraft,
      trackProfileView,
      trackWorkOpen,
      signOut,
    ],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext)
  if (!value) throw new Error("useAccount must be used inside <AccountProvider>")
  return value
}
