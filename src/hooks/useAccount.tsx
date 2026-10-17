import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import type { Account, WorkDraft } from "@/data/account"
import { readJson, removeKey, writeJson } from "@/lib/storage"
import { workFromDraft } from "@/lib/workMapper"
import type { Work } from "@/data/work"
import { setApiToken } from "@/lib/api/client"
import { mapAccount, mapApiWorkMineToDraft } from "@/lib/api/mappers"
import {
  fetchMe,
  postLogin,
  postRegister,
  postLogout,
  deleteMe,
  postForgotPassword,
  postResetPassword,
} from "@/lib/api/endpoints/auth"
import { fetchWorkMineList } from "@/lib/api/endpoints/work"
import { QUERY_KEYS } from "@/lib/api/queryKeys"
import { useMyWork } from "./useMyWork"

const TOKEN_KEY = "token"

export type SignInResult = { ok: true } | { ok: false; reason: string }

interface AccountContextValue {
  account: Account | null
  /** True while the initial GET /auth/me is in-flight. Guard auth-redirects on this. */
  isInitializing: boolean
  /** Kept for BrowseContext backward compatibility. Mutations live in useMyWork(). */
  drafts: WorkDraft[]
  publishedWork: Work[]
  register: (
    account: Omit<
      Account,
      "id" | "createdAt" | "passwordHash" | "emailVerifiedAt" | "access" | "status"
    >,
    password: string,
  ) => Promise<Account>
  signIn: (email: string, password: string) => Promise<SignInResult>
  resetPassword: (email: string, password: string) => Promise<SignInResult>
  confirmPasswordReset: (token: string, password: string) => Promise<SignInResult>
  refreshAccount: () => Promise<void>
  signOut: () => void
  deleteAccount: () => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)

function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string })?.message ?? err.message
  }
  return "An unexpected error occurred."
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)

  // Tracks whether a valid token is present - controls the me query's enabled state.
  // Also initializes the axios token synchronously on first render.
  const [tokenExists, setTokenExists] = useState<boolean>(() => {
    const t = readJson<string | null>(TOKEN_KEY, null)
    if (t) setApiToken(t)
    return !!t
  })

  const queryClient = useQueryClient()

  // Read drafts from the shared query cache (populated after login / session restore)
  const { drafts } = useMyWork()

  // Keep the latest account readable from the 401 listener without re-binding it.
  const accountRef = useRef<Account | null>(null)
  useEffect(() => {
    accountRef.current = account
  }, [account])

  // A 401 from anywhere means the session is gone. Clear it locally; AuthRoute
  // does the redirect. A suspended account is exempt, since a 401 is the
  // expected answer when it reaches past the two routes it may use.
  useEffect(() => {
    function onUnauthorized() {
      if (accountRef.current?.status === "suspended") return
      removeKey(TOKEN_KEY)
      setApiToken(null)
      setTokenExists(false)
      queryClient.removeQueries({ queryKey: QUERY_KEYS.me })
      queryClient.removeQueries({ queryKey: QUERY_KEYS.workMineList })
      setAccount(null)
    }
    window.addEventListener("wru:unauthorized", onUnauthorized)
    return () => window.removeEventListener("wru:unauthorized", onUnauthorized)
  }, [queryClient])

  // ── Session restore via useQuery ───────────────────────────────────────────
  const {
    data: meData,
    isPending: mePending,
    isError: meIsError,
  } = useQuery({
    queryKey: QUERY_KEYS.me,
    queryFn: fetchMe,
    enabled: tokenExists,
    retry: false,
    staleTime: Infinity,
  })

  // Cover the window between meData resolving and the useEffect below syncing
  // `account`. Route guards reading { account, isInitializing } otherwise see
  // isInitializing=false with account=null for one render → false redirect.
  const isInitializing = tokenExists && (mePending || (!!meData && !account))

  // Sync account + populate drafts cache when me query resolves (session restore path)
  useEffect(() => {
    if (!meData) return
    const mapped = mapAccount(meData.user)
    setAccount(mapped)
    // Only fetch drafts if not already in cache (avoids double-load after login)
    const cached = queryClient.getQueryData(QUERY_KEYS.workMineList)
    if (cached) return
    if (mapped.status === "suspended") {
      // A suspended account has no work access, so the request would just 401.
      queryClient.setQueryData<WorkDraft[]>(QUERY_KEYS.workMineList, [])
      return
    }
    fetchWorkMineList()
      .then(({ items }) =>
        queryClient.setQueryData<WorkDraft[]>(
          QUERY_KEYS.workMineList,
          items.map(mapApiWorkMineToDraft),
        ),
      )
      .catch(() => {})
  }, [meData, queryClient])

  // Token expired or revoked - clear so next load doesn't retry
  useEffect(() => {
    if (!meIsError) return
    removeKey(TOKEN_KEY)
    setApiToken(null)
    setTokenExists(false)
  }, [meIsError])

  // ── Auth actions ───────────────────────────────────────────────────────────
  const register = useCallback<AccountContextValue["register"]>(
    async (input, password) => {
      const { token, user } = await postRegister({
        name: input.name,
        email: input.email,
        password,
        location: input.location || "",
        role: input.role,
        title: input.title || "",
        years: Number(input.years) || 0,
        topics: input.topics,
        portfolioUrl: input.portfolio || "",
        pitch: input.pitch || "",
      })
      writeJson(TOKEN_KEY, token)
      setApiToken(token)
      const mapped = mapAccount(user)
      setAccount(mapped)
      queryClient.setQueryData<WorkDraft[]>(QUERY_KEYS.workMineList, [])
      queryClient.setQueryData(QUERY_KEYS.me, { user })
      setTokenExists(true)
      return mapped
    },
    [queryClient],
  )

  const signIn = useCallback<AccountContextValue["signIn"]>(
    async (email, password) => {
      try {
        const { token, user } = await postLogin(email, password)
        const mapped = mapAccount(user)
        writeJson(TOKEN_KEY, token)
        setApiToken(token)
        setAccount(mapped)
        if (mapped.status === "suspended") {
          // Suspended accounts cannot read their work, so skip the request.
          queryClient.setQueryData<WorkDraft[]>(QUERY_KEYS.workMineList, [])
        } else {
          const { items } = await fetchWorkMineList()
          queryClient.setQueryData<WorkDraft[]>(
            QUERY_KEYS.workMineList,
            items.map(mapApiWorkMineToDraft),
          )
        }
        queryClient.setQueryData(QUERY_KEYS.me, { user })
        setTokenExists(true)
        return { ok: true }
      } catch (err) {
        return { ok: false, reason: apiError(err) }
      }
    },
    [queryClient],
  )

  const resetPassword = useCallback<AccountContextValue["resetPassword"]>(async (email) => {
    try {
      await postForgotPassword(email)
      return { ok: true }
    } catch (err) {
      return { ok: false, reason: apiError(err) }
    }
  }, [])

  const confirmPasswordReset = useCallback<AccountContextValue["confirmPasswordReset"]>(
    async (token, password) => {
      try {
        const { token: newToken, user } = await postResetPassword(token, password)
        writeJson(TOKEN_KEY, newToken)
        setApiToken(newToken)
        setAccount(mapAccount(user))
        const { items } = await fetchWorkMineList()
        queryClient.setQueryData<WorkDraft[]>(
          QUERY_KEYS.workMineList,
          items.map(mapApiWorkMineToDraft),
        )
        queryClient.setQueryData(QUERY_KEYS.me, { user })
        setTokenExists(true)
        return { ok: true }
      } catch (err) {
        return { ok: false, reason: apiError(err) }
      }
    },
    [queryClient],
  )

  const refreshAccount = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: QUERY_KEYS.me })
  }, [queryClient])

  const clearSession = useCallback(() => {
    removeKey(TOKEN_KEY)
    setApiToken(null)
    setTokenExists(false)
    queryClient.removeQueries({ queryKey: QUERY_KEYS.me })
    queryClient.removeQueries({ queryKey: QUERY_KEYS.workMineList })
    queryClient.removeQueries({ queryKey: QUERY_KEYS.trafficSummary })
    queryClient.removeQueries({ queryKey: ["people", "list"] })
    queryClient.removeQueries({ queryKey: ["work", "list"] })
    setAccount(null)
  }, [queryClient])

  const signOut = useCallback(() => {
    postLogout().catch(() => {})
    clearSession()
  }, [clearSession])

  /**
   * Erases the account on the server, then clears the session. Deliberately not
   * optimistic: if the request fails the account still exists, and the panel
   * should say so rather than pretend the data is gone.
   */
  const deleteAccount = useCallback(async () => {
    await deleteMe()
    clearSession()
  }, [clearSession])

  // ── Context value ──────────────────────────────────────────────────────────
  const publishedWork = useMemo(
    () => (account ? drafts.filter((d) => d.published).map((d) => workFromDraft(d, account)) : []),
    [drafts, account],
  )

  const value = useMemo<AccountContextValue>(
    () => ({
      account,
      isInitializing,
      drafts,
      publishedWork,
      register,
      signIn,
      resetPassword,
      confirmPasswordReset,
      refreshAccount,
      signOut,
      deleteAccount,
    }),
    [
      account,
      isInitializing,
      drafts,
      publishedWork,
      register,
      signIn,
      resetPassword,
      confirmPasswordReset,
      refreshAccount,
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
