import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Account, WorkDraft } from "@/data/account";
import { readJson, removeKey, writeJson } from "@/lib/storage";
import { workFromDraft } from "@/lib/workMapper";
import type { Work } from "@/data/work";
import {
  EMPTY_TRAFFIC,
  isoDay,
  recordProfileView,
  recordWorkOpen,
  type TrafficStore,
} from "@/data/traffic";
import { seedTraffic } from "@/data/trafficSeed";
import { api, setApiToken } from "@/lib/api/client";
import {
  mapAccount,
  mapApiWorkMineToDraft,
  draftToApiBody,
  type ApiWorkMine,
} from "@/lib/api/mappers";
import {
  fetchMe,
  postLogin,
  postRegister,
  postLogout,
  postForgotPassword,
  postResetPassword,
} from "@/lib/api/endpoints/auth";
import { fetchWorkMineList } from "@/lib/api/endpoints/work";
import { QUERY_KEYS } from "@/lib/api/queryKeys";

const TOKEN_KEY = "token";
const TRAFFIC_KEY = "traffic";

const isLocalId = (id: string) => id.startsWith("w-");

// Used only for saveDraft raw calls (cleaned up in Phase 3)
type ApiResponse<T> = { success: boolean; data: T; message: string };

export type SignInResult = { ok: true } | { ok: false; reason: string };

interface AccountContextValue {
  account: Account | null;
  /** True while the initial GET /auth/me is in-flight. Guard auth-redirects on this. */
  isInitializing: boolean;
  hasStoredAccount: boolean;
  storedEmail: string | null;
  drafts: WorkDraft[];
  publishedWork: Work[];
  traffic: TrafficStore;
  register: (
    account: Omit<
      Account,
      "id" | "createdAt" | "passwordHash" | "emailVerifiedAt"
    >,
    password: string,
  ) => Promise<Account>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  /** Sends a password-reset email. The `password` param is unused (kept for compat). */
  resetPassword: (email: string, password: string) => Promise<SignInResult>;
  /** Validates a reset token and sets a new password. Signs in automatically on success. */
  confirmPasswordReset: (
    token: string,
    password: string,
  ) => Promise<SignInResult>;
  /** Re-fetches GET /auth/me and refreshes account state. Used after email verification. */
  refreshAccount: () => Promise<void>;
  updateProfile: (patch: Partial<Account>) => void;
  saveDraft: (draft: WorkDraft) => Promise<WorkDraft>;
  deleteDraft: (id: string) => Promise<void>;
  trackProfileView: () => void;
  trackWorkOpen: (workId: string) => void;
  signOut: () => void;
  deleteAccount: () => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string })?.message ?? err.message;
  }
  return "An unexpected error occurred.";
}

// Translate Account field names → backend field names for PATCH /auth/me
function profilePatchToApi(patch: Partial<Account>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.location !== undefined) out.location = patch.location;
  if (patch.role !== undefined) out.role = patch.role;
  if (patch.years !== undefined) out.years = Number(patch.years) || 0;
  if (patch.topics !== undefined) out.topics = patch.topics;
  if (patch.portfolio !== undefined) out.portfolioUrl = patch.portfolio;
  if (patch.pitch !== undefined) out.pitch = patch.pitch;
  // photo → handled via /uploads/profile/photo (separate endpoint)
  // passwordHash → frontend-only, never sent
  return out;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [drafts, setDrafts] = useState<WorkDraft[]>([]);
  const draftsRef = useRef<WorkDraft[]>([]);
  const [traffic, setTraffic] = useState<TrafficStore>(() =>
    readJson<TrafficStore>(TRAFFIC_KEY, EMPTY_TRAFFIC),
  );

  // Tracks whether a valid token is present. Controls the me query's enabled state.
  // Also initializes the axios token synchronously on first render.
  const [tokenExists, setTokenExists] = useState<boolean>(() => {
    const t = readJson<string | null>(TOKEN_KEY, null);
    if (t) setApiToken(t);
    return !!t;
  });

  // Prevents double draft-loading when login/register pre-populates the me query cache
  const draftsInitialized = useRef(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

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
    staleTime: Infinity, // Session lifetime is managed explicitly (login/logout/refresh)
  });

  // isInitializing: token exists but query hasn't resolved yet
  const isInitializing = tokenExists && mePending;

  // Sync account + drafts when me query resolves (session restore path)
  useEffect(() => {
    if (!meData) return;
    setAccount(mapAccount(meData.user));
    if (draftsInitialized.current) return;
    draftsInitialized.current = true;
    fetchWorkMineList()
      .then(({ items }) => setDrafts(items.map(mapApiWorkMineToDraft)))
      .catch(() => {});
  }, [meData]);

  // Token expired or revoked — clear it so the next load doesn't retry
  useEffect(() => {
    if (!meIsError) return;
    removeKey(TOKEN_KEY);
    setApiToken(null);
    setTokenExists(false);
  }, [meIsError]);

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
      });
      writeJson(TOKEN_KEY, token);
      setApiToken(token);
      const mapped = mapAccount(user);
      setAccount(mapped);
      setDrafts([]);
      // Seed a starter traffic history so the panel doesn't open on empty charts
      const seeded = seedTraffic(mapped.id);
      setTraffic(seeded);
      writeJson(TRAFFIC_KEY, seeded);
      // Populate query cache so refreshAccount can invalidate later
      draftsInitialized.current = true;
      queryClient.setQueryData(QUERY_KEYS.me, { user });
      setTokenExists(true);
      return mapped;
    },
    [queryClient],
  );

  const signIn = useCallback<AccountContextValue["signIn"]>(
    async (email, password) => {
      try {
        const { token, user } = await postLogin(email, password);
        writeJson(TOKEN_KEY, token);
        setApiToken(token);
        setAccount(mapAccount(user));
        const { items } = await fetchWorkMineList();
        setDrafts(items.map(mapApiWorkMineToDraft));
        // Mark drafts loaded, populate cache, enable query — order matters
        draftsInitialized.current = true;
        queryClient.setQueryData(QUERY_KEYS.me, { user });
        setTokenExists(true);
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: apiError(err) };
      }
    },
    [queryClient],
  );

  const resetPassword = useCallback<AccountContextValue["resetPassword"]>(
    async (email) => {
      try {
        await postForgotPassword(email);
        return { ok: false, reason: "Reset link sent — check your inbox." };
      } catch (err) {
        return { ok: false, reason: apiError(err) };
      }
    },
    [],
  );

  const confirmPasswordReset = useCallback<
    AccountContextValue["confirmPasswordReset"]
  >(
    async (token, password) => {
      try {
        const { token: newToken, user } = await postResetPassword(
          token,
          password,
        );
        writeJson(TOKEN_KEY, newToken);
        setApiToken(newToken);
        setAccount(mapAccount(user));
        const { items } = await fetchWorkMineList();
        setDrafts(items.map(mapApiWorkMineToDraft));
        draftsInitialized.current = true;
        queryClient.setQueryData(QUERY_KEYS.me, { user });
        setTokenExists(true);
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: apiError(err) };
      }
    },
    [queryClient],
  );

  const refreshAccount = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: QUERY_KEYS.me });
    // meData effect updates account automatically after refetch
  }, [queryClient]);

  const updateProfile = useCallback<AccountContextValue["updateProfile"]>(
    (patch) => {
      // Optimistic: update UI immediately, sync to API in the background
      setAccount((current) => (current ? { ...current, ...patch } : current));
      api.patch("/user/auth/me", profilePatchToApi(patch)).catch(() => {
        // On failure the local state stays updated; a page refresh will re-sync from GET /me
      });
    },
    [],
  );

  const signOut = useCallback(() => {
    postLogout().catch(() => {});
    removeKey(TOKEN_KEY);
    setApiToken(null);
    setTokenExists(false);
    draftsInitialized.current = false;
    queryClient.removeQueries({ queryKey: QUERY_KEYS.me });
    setAccount(null);
    setDrafts([]);
  }, [queryClient]);

  const deleteAccount = useCallback(() => {
    postLogout().catch(() => {});
    removeKey(TOKEN_KEY);
    setApiToken(null);
    setTokenExists(false);
    draftsInitialized.current = false;
    queryClient.removeQueries({ queryKey: QUERY_KEYS.me });
    setAccount(null);
    setDrafts([]);
    setTraffic(EMPTY_TRAFFIC);
    removeKey(TRAFFIC_KEY);
  }, [queryClient]);

  // ── Draft / portfolio actions (raw calls — cleaned up in Phase 3) ──────────
  const saveDraft = useCallback<AccountContextValue["saveDraft"]>(
    async (draft) => {
      const body = draftToApiBody(draft);
      let resolved = draft;

      if (isLocalId(draft.id)) {
        // First save: create on server, swap local id → MongoDB id
        const res = await api.post<ApiResponse<{ work: ApiWorkMine }>>(
          "/user/work",
          body,
        );
        const serverDraft = mapApiWorkMineToDraft(res.data.data.work);
        // Keep the user's current in-progress values (server echoes minimal data on create)
        resolved = {
          ...serverDraft,
          values: draft.values,
          links: draft.links,
          sections: draft.sections,
          metrics: draft.metrics,
          skills: draft.skills,
          topics: draft.topics,
          figures: draft.figures,
        };
      } else {
        await api.put(`/user/work/${draft.id}`, body);
        resolved = { ...draft, updatedAt: new Date().toISOString() };
      }

      // Handle thumbnail: upload data URL to API, or delete if removed
      const prevThumb = draftsRef.current.find(
        (d) => d.id === draft.id || d.id === resolved.id,
      )?.thumbnail;
      if (resolved.thumbnail?.startsWith("data:")) {
        try {
          const blob = await fetch(resolved.thumbnail).then((r) => r.blob());
          const ext = blob.type.split("/")[1] ?? "jpg";
          const form = new FormData();
          form.append(
            "file",
            new File([blob], `thumbnail.${ext}`, { type: blob.type }),
          );
          const upRes = await api.post<ApiResponse<{ thumbnailPath: string }>>(
            `/user/uploads/work/${resolved.id}/thumbnail`,
            form,
            { headers: { "Content-Type": "multipart/form-data" } },
          );
          resolved = { ...resolved, thumbnail: upRes.data.data.thumbnailPath };
        } catch {
          // Upload failed — keep data URL locally, will retry on next save
        }
      } else if (
        !resolved.thumbnail &&
        prevThumb &&
        !prevThumb.startsWith("data:")
      ) {
        await api
          .delete(`/user/uploads/work/${resolved.id}/thumbnail`)
          .catch(() => {});
      }

      // Handle publish state change relative to what we had before
      const prev = draftsRef.current.find(
        (d) => d.id === draft.id || d.id === resolved.id,
      );
      const wasPublished = prev?.published ?? false;

      if (resolved.published && !wasPublished) {
        try {
          await api.post(`/user/work/${resolved.id}/publish`);
        } catch {
          resolved = { ...resolved, published: false };
        }
      } else if (!resolved.published && wasPublished) {
        await api.post(`/user/work/${resolved.id}/unpublish`).catch(() => {});
      }

      setDrafts((current) => {
        // Remove old local-id entry if id changed, then upsert
        const without = current.filter((d) => d.id !== draft.id);
        const exists = without.some((d) => d.id === resolved.id);
        return exists
          ? without.map((d) => (d.id === resolved.id ? resolved : d))
          : [resolved, ...without];
      });

      return resolved;
    },
    [],
  );

  const deleteDraft = useCallback<AccountContextValue["deleteDraft"]>(
    async (id) => {
      if (!isLocalId(id)) {
        await api.delete(`/user/work/${id}`);
      }
      setDrafts((current) => current.filter((d) => d.id !== id));
    },
    [],
  );

  // ── Traffic tracking (local-only) ──────────────────────────────────────────
  const trackProfileView = useCallback(() => {
    setTraffic((current) => {
      const next = recordProfileView(current, isoDay(new Date()));
      writeJson(TRAFFIC_KEY, next);
      return next;
    });
  }, []);

  const trackWorkOpen = useCallback((workId: string) => {
    setTraffic((current) => {
      const next = recordWorkOpen(current, isoDay(new Date()), workId);
      writeJson(TRAFFIC_KEY, next);
      return next;
    });
  }, []);

  // ── Context value ──────────────────────────────────────────────────────────
  const publishedWork = useMemo(
    () =>
      account
        ? drafts
            .filter((d) => d.published)
            .map((d) => workFromDraft(d, account))
        : [],
    [drafts, account],
  );

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
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext);
  if (!value)
    throw new Error("useAccount must be used inside <AccountProvider>");
  return value;
}
