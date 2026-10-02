import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAccount } from "@/hooks/useAccount"
import {
  EMPTY_MODERATION,
  type AuditEntry,
  type ModerationActionId,
  type ModerationState,
  type Notice,
  type Report,
  type ReportReasonId,
  type SiteContact,
  type Target,
  type TargetKind,
} from "@/data/admin"
import { copySlotById } from "@/data/siteCopy"
import type { RoleId } from "@/data/taxonomy"
import { QUERY_KEYS } from "@/lib/api/queryKeys"
import {
  fetchReports,
  fetchAppeals,
  fetchAuditLog,
  fetchSettings,
  resolveReport as apiResolveReport,
  unpublishWork,
  republishWork,
  suspendPerson,
  reinstatePerson,
  decideAppeal as apiDecideAppeal,
  updateSettings,
  type ApiModerationReport,
  type ApiModerationAppeal,
  type ApiModerationLogEntry,
} from "@/lib/api/endpoints/moderation"

function mapReport(r: ApiModerationReport): Report {
  return {
    id: r._id,
    target: { kind: (r.targetKind === "user" ? "person" : r.targetKind) as TargetKind, id: r.targetId },
    reason: r.reason as Report["reason"],
    note: r.note ?? "",
    createdAt: r.createdAt,
  }
}

function mapAppeal(a: ApiModerationAppeal): Notice {
  return {
    id: a._id,
    personId: a.userId,
    action: a.action as ModerationActionId,
    target: a.targetKind && a.targetId
      ? { kind: (a.targetKind === "user" ? "person" : a.targetKind) as TargetKind, id: a.targetId }
      : null,
    targetLabel: a.targetLabel,
    reason: a.reason,
    at: a.createdAt,
    readAt: a.readAt ?? null,
    appeal: a.appeal
      ? {
          text: a.appeal.text,
          at: a.appeal.createdAt,
          outcome: a.appeal.outcome,
          outcomeReason: a.appeal.outcomeReason ?? "",
          decidedAt: a.appeal.decidedAt ?? null,
        }
      : null,
  }
}

function mapLogEntry(l: ApiModerationLogEntry): AuditEntry {
  return {
    id: l._id,
    action: l.action as ModerationActionId,
    target: l.targetKind && l.targetId
      ? { kind: (l.targetKind === "user" ? "person" : l.targetKind) as TargetKind, id: l.targetId }
      : null,
    targetLabel: l.targetLabel,
    reason: l.reason,
    at: l.createdAt,
    by: l.actorSlug ?? "Moderator",
  }
}

interface AdminContextValue {
  state: ModerationState
  isWorkHidden: (workId: string) => boolean
  isPersonSuspended: (personId: string) => boolean
  isRoleDisabled: (role: RoleId) => boolean
  copy: (slotId: string) => string
  report: (target: Target, reason: ReportReasonId, note: string) => void
  setWorkHidden: (workId: string, hidden: boolean, label: string, reason: string, authorId?: string) => void
  setPersonSuspended: (personId: string, suspended: boolean, label: string, reason: string) => void
  noticesFor: (personId: string) => Notice[]
  markNoticeRead: (noticeId: string) => void
  appealNotice: (noticeId: string, text: string) => void
  decideAppeal: (noticeId: string, outcome: "upheld" | "overturned", reason: string) => void
  dismiss: (key: string, label: string, reason: string) => void
  resolveReport: (reportId: string, reason: string) => void
  setRoleDisabled: (role: RoleId, disabled: boolean, label: string) => void
  setContact: (contact: SiteContact) => void
  setCopy: (slotId: string, value: string) => void
  resetAll: () => void
}

const AdminContext = createContext<AdminContextValue | null>(null)

/**
 * Moderation decisions and site settings, sourced from the API.
 *
 * Predicates `isWorkHidden` / `isPersonSuspended` always return false because
 * the server already filters hidden and suspended content from public listings.
 * The audit log is the source of truth for past decisions.
 *
 * `dismiss` and `reviewed` are local-only: flags are client-side lint checks and
 * their dismissal does not need to persist across moderators or devices.
 *
 * Nothing here is an access control. The gate lives in the API, where
 * `isAuth("moderator")` checks the access level on a verified token.
 */
export function AdminProvider({ children }: { children: ReactNode }) {
  const { account } = useAccount()
  const queryClient = useQueryClient()
  const isMod = account?.access === "moderator" || account?.access === "admin"

  const [reviewed, setReviewed] = useState<string[]>([])

  const { data: apiReports = [] } = useQuery({
    queryKey: QUERY_KEYS.moderationReports,
    queryFn:  fetchReports,
    enabled:  isMod,
    staleTime: 60 * 1000,
  })

  const { data: apiAppeals = [] } = useQuery({
    queryKey: QUERY_KEYS.moderationAppeals,
    queryFn:  fetchAppeals,
    enabled:  isMod,
    staleTime: 60 * 1000,
  })

  const { data: apiLog = [] } = useQuery({
    queryKey: QUERY_KEYS.moderationLog,
    queryFn:  fetchAuditLog,
    enabled:  isMod,
    staleTime: 60 * 1000,
  })

  const { data: apiSettings = null } = useQuery({
    queryKey: QUERY_KEYS.moderationSettings,
    queryFn:  fetchSettings,
    enabled:  isMod,
    staleTime: 5 * 60 * 1000,
  })

  const state = useMemo<ModerationState>(() => ({
    hiddenWork:       [],
    suspendedPeople:  [],
    reviewed,
    reports:          apiReports.map(mapReport),
    notices:          apiAppeals.map(mapAppeal),
    log:              apiLog.map(mapLogEntry),
    disabledRoles:    (apiSettings?.disabledRoles ?? []) as RoleId[],
    contact:          apiSettings?.contact ?? EMPTY_MODERATION.contact,
    copy:             apiSettings?.copy ?? {},
  }), [reviewed, apiReports, apiAppeals, apiLog, apiSettings])

  const invalidateModeration = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["moderation"] })
  }, [queryClient])

  const setWorkHidden = useCallback(
    async (workId: string, hidden: boolean, _label: string, reason: string) => {
      if (hidden) await unpublishWork(workId, reason)
      else await republishWork(workId, reason)
      queryClient.invalidateQueries({ queryKey: ["work", "list"] })
      queryClient.invalidateQueries({ queryKey: ["people", "list"] })
      invalidateModeration()
    },
    [queryClient, invalidateModeration],
  )

  const setPersonSuspended = useCallback(
    async (personId: string, suspended: boolean, _label: string, reason: string) => {
      if (suspended) await suspendPerson(personId, reason)
      else await reinstatePerson(personId, reason)
      queryClient.invalidateQueries({ queryKey: ["people", "list"] })
      queryClient.invalidateQueries({ queryKey: ["work", "list"] })
      invalidateModeration()
    },
    [queryClient, invalidateModeration],
  )

  const resolveReport = useCallback(
    async (reportId: string, reason: string) => {
      await apiResolveReport(reportId, reason)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.moderationReports })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.moderationLog })
    },
    [queryClient],
  )

  const decideAppeal = useCallback(
    async (noticeId: string, outcome: "upheld" | "overturned", reason: string) => {
      await apiDecideAppeal(noticeId, outcome, reason)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.moderationAppeals })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.moderationLog })
      if (outcome === "overturned") {
        queryClient.invalidateQueries({ queryKey: ["work", "list"] })
        queryClient.invalidateQueries({ queryKey: ["people", "list"] })
      }
    },
    [queryClient],
  )

  const dismiss = useCallback((key: string) => {
    setReviewed((cur) => [...new Set([...cur, key])])
  }, [])

  const setRoleDisabled = useCallback(
    async (role: RoleId, disabled: boolean, label: string) => {
      const current = (apiSettings?.disabledRoles ?? []) as RoleId[]
      const next = disabled
        ? [...new Set([...current, role])]
        : current.filter((r) => r !== role)
      await updateSettings(
        { disabledRoles: next },
        disabled ? `Hidden from browse controls: ${label}` : `Shown in browse controls again: ${label}`,
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.moderationSettings })
    },
    [queryClient, apiSettings],
  )

  const setContact = useCallback(
    async (contact: SiteContact) => {
      await updateSettings({ contact }, `Contact updated: ${contact.email}, ${contact.location}`)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.moderationSettings })
    },
    [queryClient],
  )

  const setCopy = useCallback(
    async (slotId: string, value: string) => {
      const currentCopy = { ...(apiSettings?.copy ?? {}) }
      const fallback = copySlotById(slotId)?.defaultValue ?? ""
      if (value.trim() === "" || value === fallback) delete currentCopy[slotId]
      else currentCopy[slotId] = value
      await updateSettings(
        { copy: currentCopy },
        currentCopy[slotId] ? "Copy edited" : "Copy reset to the shipped default",
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.moderationSettings })
    },
    [queryClient, apiSettings],
  )

  const resetAll = useCallback(() => {
    setReviewed([])
  }, [])

  // Phase 5: wire to POST /reports
  const report = useCallback((_target: Target, _reason: ReportReasonId, _note: string) => {}, [])

  const noticesFor = useCallback(
    (personId: string) => state.notices.filter((n) => n.personId === personId),
    [state.notices],
  )

  // Phase 5: wire to user-facing notice API
  const markNoticeRead = useCallback((_noticeId: string) => {}, [])
  const appealNotice = useCallback((_noticeId: string, _text: string) => {}, [])

  const value = useMemo<AdminContextValue>(
    () => ({
      state,
      isWorkHidden:      () => false,
      isPersonSuspended: () => false,
      isRoleDisabled:    (role) => state.disabledRoles.includes(role),
      copy:              (slotId) => state.copy[slotId] ?? copySlotById(slotId)?.defaultValue ?? "",
      report,
      setWorkHidden,
      setPersonSuspended,
      noticesFor,
      markNoticeRead,
      appealNotice,
      decideAppeal,
      dismiss,
      resolveReport,
      setRoleDisabled,
      setContact,
      setCopy,
      resetAll,
    }),
    [
      state,
      report,
      setWorkHidden,
      setPersonSuspended,
      noticesFor,
      markNoticeRead,
      appealNotice,
      decideAppeal,
      dismiss,
      resolveReport,
      setRoleDisabled,
      setContact,
      setCopy,
      resetAll,
    ],
  )

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext)
  if (!value) throw new Error("useAdmin must be used inside <AdminProvider>")
  return value
}