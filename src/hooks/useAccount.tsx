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
import { hashPassword, verifyPassword } from "@/lib/password"

const ACCOUNT_KEY = "account"
const DRAFTS_KEY = "drafts"
const TRAFFIC_KEY = "traffic"
const SESSION_KEY = "session"

export type SignInResult = { ok: true } | { ok: false; reason: string }

interface AccountContextValue {
  /** The **signed-in** account, or null. Components need nothing else. */
  account: Account | null
  /**
   * Whether a profile exists in this browser at all, signed in or not. Only
   * the sign-in and reset screens care: it lets them say "no profile here"
   * instead of "wrong password".
   */
  hasStoredAccount: boolean
  storedEmail: string | null
  drafts: WorkDraft[]
  /** Published entries, mapped into the shared Work model. */
  publishedWork: Work[]
  traffic: TrafficStore
  register: (account: Omit<Account, "id" | "createdAt" | "passwordHash">, password: string) => Promise<Account>
  signIn: (email: string, password: string) => Promise<SignInResult>
  /** Demo recovery: no mail is sent, the hash is replaced in place. */
  resetPassword: (email: string, password: string) => Promise<SignInResult>
  updateProfile: (patch: Partial<Account>) => void
  saveDraft: (draft: WorkDraft) => void
  deleteDraft: (id: string) => void
  trackProfileView: () => void
  trackWorkOpen: (workId: string) => void
  /** Ends the session. The profile and its entries stay, so you can return. */
  signOut: () => void
  /** Removes the profile, its entries and its traffic from this browser. */
  deleteAccount: () => void
}

const AccountContext = createContext<AccountContextValue | null>(null)

/**
 * The whole "account" is a localStorage record. There is no backend by design,
 * so this is the seam a real API would slot into later - every component talks
 * to this hook rather than to storage.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  /**
   * The stored record and the session are separate.
   *
   * They used to be the same thing: an account existed only while you were
   * signed in, so signing out deleted the profile and every draft with it.
   * That is fine when the only way in is a join form, and impossible once
   * there is a sign-in screen - there would be nothing left to sign in to.
   */
  const [record, setRecord] = useState<Account | null>(() => readJson<Account | null>(ACCOUNT_KEY, null))
  const [signedIn, setSignedIn] = useState<boolean>(() => readJson<boolean>(SESSION_KEY, false))
  const account = signedIn ? record : null
  const [drafts, setDrafts] = useState<WorkDraft[]>(() => readJson<WorkDraft[]>(DRAFTS_KEY, []))
  const [traffic, setTraffic] = useState<TrafficStore>(() =>
    readJson<TrafficStore>(TRAFFIC_KEY, EMPTY_TRAFFIC),
  )

  const persistAccount = useCallback((next: Account | null) => {
    setRecord(next)
    if (next) writeJson(ACCOUNT_KEY, next)
    else removeKey(ACCOUNT_KEY)
  }, [])

  const persistSession = useCallback((next: boolean) => {
    setSignedIn(next)
    writeJson(SESSION_KEY, next)
  }, [])

  const persistDrafts = useCallback((next: WorkDraft[]) => {
    setDrafts(next)
    writeJson(DRAFTS_KEY, next)
  }, [])

  const register = useCallback<AccountContextValue["register"]>(
    async (input, password) => {
      const next: Account = {
        ...input,
        id: `me-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
        passwordHash: await hashPassword(password),
      }
      persistAccount(next)
      persistSession(true)
      // A brand-new panel with three empty charts teaches nothing, so the
      // traffic view starts from a seeded history. It is labelled as such,
      // and real opens in this browser are counted on top of it.
      const seeded = seedTraffic(next.id)
      setTraffic(seeded)
      writeJson(TRAFFIC_KEY, seeded)
      return next
    },
    [persistAccount, persistSession],
  )

  const signIn = useCallback<AccountContextValue["signIn"]>(
    async (email, password) => {
      if (!record) return { ok: false, reason: "No profile exists in this browser yet." }
      if (record.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
        return { ok: false, reason: "That email does not match the profile in this browser." }
      }
      if (!record.passwordHash) {
        // A profile created before passwords existed. Let them in rather than
        // locking them out of their own data, and ask them to set one.
        persistSession(true)
        return { ok: true }
      }
      if (!(await verifyPassword(password, record.passwordHash))) {
        return { ok: false, reason: "That password is not right." }
      }
      persistSession(true)
      return { ok: true }
    },
    [record, persistSession],
  )

  const resetPassword = useCallback<AccountContextValue["resetPassword"]>(
    async (email, password) => {
      if (!record) return { ok: false, reason: "No profile exists in this browser yet." }
      if (record.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
        return { ok: false, reason: "That email does not match the profile in this browser." }
      }
      const next = { ...record, passwordHash: await hashPassword(password) }
      persistAccount(next)
      persistSession(true)
      return { ok: true }
    },
    [record, persistAccount, persistSession],
  )

  const updateProfile = useCallback<AccountContextValue["updateProfile"]>(
    (patch) => {
      setRecord((current) => {
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

  // Ends the session only. Everything written stays, which is the whole point
  // of having a way back in.
  const signOut = useCallback(() => persistSession(false), [persistSession])

  const deleteAccount = useCallback(() => {
    persistAccount(null)
    persistSession(false)
    persistDrafts([])
    setTraffic(EMPTY_TRAFFIC)
    removeKey(TRAFFIC_KEY)
  }, [persistAccount, persistSession, persistDrafts])

  const publishedWork = useMemo(
    () => (account ? drafts.filter((d) => d.published).map((d) => workFromDraft(d, account)) : []),
    [drafts, account],
  )

  const value = useMemo<AccountContextValue>(
    () => ({
      account,
      hasStoredAccount: record !== null,
      storedEmail: record?.email ?? null,
      drafts,
      publishedWork,
      traffic,
      register,
      signIn,
      resetPassword,
      updateProfile,
      saveDraft,
      deleteDraft,
      trackProfileView,
      trackWorkOpen,
      signOut,
      deleteAccount,
    }),
    [
      account,
      record,
      drafts,
      publishedWork,
      traffic,
      register,
      signIn,
      resetPassword,
      updateProfile,
      saveDraft,
      deleteDraft,
      trackProfileView,
      trackWorkOpen,
      signOut,
      deleteAccount,
    ],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext)
  if (!value) throw new Error("useAccount must be used inside <AccountProvider>")
  return value
}
