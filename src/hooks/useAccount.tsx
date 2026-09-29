import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import axios from "axios"
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
import { api, setApiToken } from "@/lib/api/client"
import { mapAccount, type ApiUser } from "@/lib/api/mappers"

const TOKEN_KEY   = "token"
const DRAFTS_KEY  = "drafts"
const TRAFFIC_KEY = "traffic"

type ApiResponse<T> = { success: boolean; data: T; message: string }

export type SignInResult = { ok: true } | { ok: false; reason: string }

interface AccountContextValue {
  account: Account | null
  /** True while the initial GET /auth/me is in-flight. Guard auth-redirects on this. */
  isInitializing: boolean
  hasStoredAccount: boolean
  storedEmail: string | null
  drafts: WorkDraft[]
  publishedWork: Work[]
  traffic: TrafficStore
  register: (account: Omit<Account, "id" | "createdAt" | "passwordHash" | "emailVerifiedAt">, password: string) => Promise<Account>
  signIn: (email: string, password: string) => Promise<SignInResult>
  /** Sends a password-reset email. The `password` param is unused (kept for compat). */
  resetPassword: (email: string, password: string) => Promise<SignInResult>
  /** Validates a reset token and sets a new password. Signs in automatically on success. */
  confirmPasswordReset: (token: string, password: string) => Promise<SignInResult>
  /** Re-fetches GET /auth/me and refreshes account state. Used after email verification. */
  refreshAccount: () => Promise<void>
  updateProfile: (patch: Partial<Account>) => void
  saveDraft: (draft: WorkDraft) => void
  deleteDraft: (id: string) => void
  trackProfileView: () => void
  trackWorkOpen: (workId: string) => void
  signOut: () => void
  deleteAccount: () => void
}

const AccountContext = createContext<AccountContextValue | null>(null)

function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string })?.message ?? err.message
  }
  return "An unexpected error occurred."
}

// Translate Account field names → backend field names for PATCH /auth/me
function profilePatchToApi(patch: Partial<Account>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (patch.name      !== undefined) out.name         = patch.name
  if (patch.title     !== undefined) out.title        = patch.title
  if (patch.location  !== undefined) out.location     = patch.location
  if (patch.role      !== undefined) out.role         = patch.role
  if (patch.years     !== undefined) out.years        = Number(patch.years) || 0
  if (patch.topics    !== undefined) out.topics       = patch.topics
  if (patch.portfolio !== undefined) out.portfolioUrl = patch.portfolio
  if (patch.pitch     !== undefined) out.pitch        = patch.pitch
  // photo → handled via /uploads/profile/photo (separate endpoint)
  // passwordHash → frontend-only, never sent
  return out
}

/**
 * All auth, drafts and traffic in one context.
 * Seam: every component talks to this hook rather than to storage or the API
 * directly. Replacing a localStorage body with a fetch call here touches nothing
 * outside this file.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  // isInitializing is true only when a token exists and the /auth/me call hasn't resolved yet
  const [isInitializing, setIsInitializing] = useState(
    () => Boolean(readJson<string | null>(TOKEN_KEY, null)),
  )
  const [drafts, setDrafts]   = useState<WorkDraft[]>(() => readJson<WorkDraft[]>(DRAFTS_KEY, []))
  const [traffic, setTraffic] = useState<TrafficStore>(() => readJson<TrafficStore>(TRAFFIC_KEY, EMPTY_TRAFFIC))

  // Restore session on mount if a JWT is stored locally
  useEffect(() => {
    const token = readJson<string | null>(TOKEN_KEY, null)
    if (!token) { setIsInitializing(false); return }
    setApiToken(token)
    api
      .get<ApiResponse<{ user: ApiUser }>>("/user/auth/me")
      .then((res) => setAccount(mapAccount(res.data.data.user)))
      .catch(() => {
        // Token expired or revoked — clear it so we don't retry on the next load
        removeKey(TOKEN_KEY)
        setApiToken(null)
      })
      .finally(() => setIsInitializing(false))
  }, [])

  const persistDrafts = useCallback((next: WorkDraft[]) => {
    setDrafts(next)
    writeJson(DRAFTS_KEY, next)
  }, [])

  const register = useCallback<AccountContextValue["register"]>(
    async (input: Omit<Account, "id" | "createdAt" | "passwordHash" | "emailVerifiedAt">, password: string) => {
      const res = await api.post<ApiResponse<{ token: string; user: ApiUser }>>(
        "/user/auth/register",
        {
          name:         input.name,
          email:        input.email,
          password,
          location:     input.location  || "",
          role:         input.role,
          title:        input.title     || "",
          years:        Number(input.years) || 0,
          topics:       input.topics,
          portfolioUrl: input.portfolio || "",
          pitch:        input.pitch     || "",
        },
      )
      const { token, user } = res.data.data
      writeJson(TOKEN_KEY, token)
      setApiToken(token)
      const mapped = mapAccount(user)
      setAccount(mapped)
      // Seed a starter traffic history so the panel doesn't open on empty charts
      const seeded = seedTraffic(mapped.id)
      setTraffic(seeded)
      writeJson(TRAFFIC_KEY, seeded)
      return mapped
    },
    [],
  )

  const signIn = useCallback<AccountContextValue["signIn"]>(
    async (email, password) => {
      try {
        const res = await api.post<ApiResponse<{ token: string; user: ApiUser }>>(
          "/user/auth/login",
          { email, password },
        )
        const { token, user } = res.data.data
        writeJson(TOKEN_KEY, token)
        setApiToken(token)
        setAccount(mapAccount(user))
        return { ok: true }
      } catch (err) {
        return { ok: false, reason: apiError(err) }
      }
    },
    [],
  )

  const resetPassword = useCallback<AccountContextValue["resetPassword"]>(
    async (email) => {
      try {
        await api.post("/user/auth/forgot-password", { email })
        return { ok: false, reason: "Reset link sent — check your inbox." }
      } catch (err) {
        return { ok: false, reason: apiError(err) }
      }
    },
    [],
  )

  const confirmPasswordReset = useCallback<AccountContextValue["confirmPasswordReset"]>(
    async (token, password) => {
      try {
        const res = await api.post<ApiResponse<{ token: string; user: ApiUser }>>(
          "/user/auth/reset-password",
          { token, password },
        )
        const { token: newToken, user } = res.data.data
        writeJson(TOKEN_KEY, newToken)
        setApiToken(newToken)
        setAccount(mapAccount(user))
        return { ok: true }
      } catch (err) {
        return { ok: false, reason: apiError(err) }
      }
    },
    [],
  )

  const updateProfile = useCallback<AccountContextValue["updateProfile"]>(
    (patch) => {
      // Optimistic: update UI immediately, sync to API in the background
      setAccount((current) => (current ? { ...current, ...patch } : current))
      api.patch("/user/auth/me", profilePatchToApi(patch)).catch(() => {
        // On failure the local state stays updated; a page refresh will re-sync from GET /me
      })
    },
    [],
  )

  const saveDraft = useCallback<AccountContextValue["saveDraft"]>(
    (draft) => {
      setDrafts((current) => {
        const stamped = { ...draft, updatedAt: new Date().toISOString() }
        const exists  = current.some((item) => item.id === stamped.id)
        const next    = exists
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

  const refreshAccount = useCallback(async () => {
    const token = readJson<string | null>(TOKEN_KEY, null)
    if (!token) return
    const res = await api.get<ApiResponse<{ user: ApiUser }>>("/user/auth/me")
    setAccount(mapAccount(res.data.data.user))
  }, [])

  const signOut = useCallback(() => {
    api.post("/user/auth/logout").catch(() => {})
    removeKey(TOKEN_KEY)
    setApiToken(null)
    setAccount(null)
  }, [])

  const deleteAccount = useCallback(() => {
    api.post("/user/auth/logout").catch(() => {})
    removeKey(TOKEN_KEY)
    setApiToken(null)
    setAccount(null)
    persistDrafts([])
    setTraffic(EMPTY_TRAFFIC)
    removeKey(TRAFFIC_KEY)
  }, [persistDrafts])

  const publishedWork = useMemo(
    () => (account ? drafts.filter((d) => d.published).map((d) => workFromDraft(d, account)) : []),
    [drafts, account],
  )

  const value = useMemo<AccountContextValue>(
    () => ({
      account,
      isInitializing,
      hasStoredAccount: true,
      storedEmail: account?.email ?? null,
      drafts,
      publishedWork,
      traffic,
      register,
      signIn,
      resetPassword,
      confirmPasswordReset,
      refreshAccount,
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
      isInitializing,
      drafts,
      publishedWork,
      traffic,
      register,
      signIn,
      resetPassword,
      confirmPasswordReset,
      refreshAccount,
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
