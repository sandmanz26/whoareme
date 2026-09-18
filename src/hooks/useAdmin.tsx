import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
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
} from "@/data/admin"
import { copySlotById } from "@/data/siteCopy"
import type { RoleId } from "@/data/taxonomy"
import { readJson, writeJson } from "@/lib/storage"

const KEY = "moderation"

interface AdminContextValue {
  state: ModerationState
  /** Overlay predicates the public surfaces read. */
  isWorkHidden: (workId: string) => boolean
  isPersonSuspended: (personId: string) => boolean
  isRoleDisabled: (role: RoleId) => boolean
  /** Current value of an editable string, falling back to the shipped default. */
  copy: (slotId: string) => string

  report: (target: Target, reason: ReportReasonId, note: string) => void
  /** `authorId` receives the statement of reasons the decision owes them. */
  setWorkHidden: (
    workId: string,
    hidden: boolean,
    label: string,
    reason: string,
    authorId?: string,
  ) => void
  setPersonSuspended: (personId: string, suspended: boolean, label: string, reason: string) => void
  /** Notices addressed to one person, newest first. */
  noticesFor: (personId: string) => Notice[]
  markNoticeRead: (noticeId: string) => void
  /** The author contests a decision. */
  appealNotice: (noticeId: string, text: string) => void
  /** A moderator decides an appeal. Overturning reverses the original action. */
  decideAppeal: (noticeId: string, outcome: "upheld" | "overturned", reason: string) => void
  dismiss: (key: string, label: string, reason: string) => void
  resolveReport: (reportId: string, reason: string) => void
  setRoleDisabled: (role: RoleId, disabled: boolean, label: string) => void
  setContact: (contact: SiteContact) => void
  setCopy: (slotId: string, value: string) => void
  resetAll: () => void
}

const AdminContext = createContext<AdminContextValue | null>(null)

function id(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * Moderation decisions and site settings, over `localStorage`.
 *
 * Deliberately a sibling of `useAccount` rather than part of it: an author's
 * own drafts and a moderator's decisions about everyone's content are
 * different data with different lifetimes, and merging them would mean signing
 * out wipes the moderation log.
 *
 * Nothing here is an access control. Anyone who can open this build can open
 * the console; the gate lives in the API, where `requireAdmin` checks a role on
 * a verified token. The console says so on screen rather than implying a
 * security boundary that does not exist.
 */
export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModerationState>(() => ({
    ...EMPTY_MODERATION,
    ...readJson<Partial<ModerationState>>(KEY, {}),
  }))

  const persist = useCallback((next: ModerationState) => {
    setState(next)
    writeJson(KEY, next)
  }, [])

  /** Every state change goes through here, so nothing lands unlogged. */
  const commit = useCallback(
    (
      patch: Partial<ModerationState>,
      entry: { action: ModerationActionId; target: Target | null; targetLabel: string; reason: string },
    ) => {
      setState((current) => {
        const log: AuditEntry = {
          id: id(),
          action: entry.action,
          target: entry.target,
          targetLabel: entry.targetLabel,
          reason: entry.reason.trim() || "No reason given",
          at: new Date().toISOString(),
          // No accounts in this build. The API records the authenticated admin.
          by: "Moderator (local)",
        }
        const next = { ...current, ...patch, log: [log, ...current.log].slice(0, 200) }
        writeJson(KEY, next)
        return next
      })
    },
    [],
  )

  const report = useCallback(
    (target: Target, reason: ReportReasonId, note: string) => {
      setState((current) => {
        const entry: Report = {
          id: id(),
          target,
          reason,
          note: note.trim(),
          createdAt: new Date().toISOString(),
        }
        const next = { ...current, reports: [entry, ...current.reports].slice(0, 200) }
        writeJson(KEY, next)
        return next
      })
    },
    [],
  )

  const setWorkHidden = useCallback(
    (workId: string, hidden: boolean, label: string, reason: string, authorId?: string) => {
      setState((current) => {
        const hiddenWork = hidden
          ? [...new Set([...current.hiddenWork, workId])]
          : current.hiddenWork.filter((item) => item !== workId)
        const at = new Date().toISOString()
        const action: ModerationActionId = hidden ? "unpublish" : "republish"
        const log: AuditEntry = {
          id: id(),
          action,
          target: { kind: "work", id: workId },
          targetLabel: label,
          reason: reason.trim() || "No reason given",
          at,
          by: "Moderator (local)",
        }
        // The notice is created in the same operation as the decision, so a
        // withheld entry cannot exist without its author having been told why.
        const notices = authorId
          ? [
              {
                id: id(),
                personId: authorId,
                action,
                target: { kind: "work" as const, id: workId },
                targetLabel: label,
                reason: log.reason,
                at,
                readAt: null,
                appeal: null,
              },
              ...current.notices,
            ].slice(0, 100)
          : current.notices
        const next = { ...current, hiddenWork, notices, log: [log, ...current.log].slice(0, 200) }
        writeJson(KEY, next)
        return next
      })
    },
    [],
  )

  const setPersonSuspended = useCallback(
    (personId: string, suspended: boolean, label: string, reason: string) => {
      setState((current) => {
        const suspendedPeople = suspended
          ? [...new Set([...current.suspendedPeople, personId])]
          : current.suspendedPeople.filter((item) => item !== personId)
        const at = new Date().toISOString()
        const action: ModerationActionId = suspended ? "suspend" : "reinstate"
        const log: AuditEntry = {
          id: id(),
          action,
          target: { kind: "person", id: personId },
          targetLabel: label,
          reason: reason.trim() || "No reason given",
          at,
          by: "Moderator (local)",
        }
        const notices = [
          {
            id: id(),
            personId,
            action,
            target: { kind: "person" as const, id: personId },
            targetLabel: label,
            reason: log.reason,
            at,
            readAt: null,
            appeal: null,
          },
          ...current.notices,
        ].slice(0, 100)
        const next = {
          ...current,
          suspendedPeople,
          notices,
          log: [log, ...current.log].slice(0, 200),
        }
        writeJson(KEY, next)
        return next
      })
    },
    [],
  )

  const dismiss = useCallback(
    (key: string, label: string, reason: string) => {
      setState((current) => {
        const log: AuditEntry = {
          id: id(),
          action: "dismiss",
          target: null,
          targetLabel: label,
          reason: reason.trim() || "No reason given",
          at: new Date().toISOString(),
          by: "Moderator (local)",
        }
        const next = {
          ...current,
          reviewed: [...new Set([...current.reviewed, key])],
          log: [log, ...current.log].slice(0, 200),
        }
        writeJson(KEY, next)
        return next
      })
    },
    [],
  )

  const resolveReport = useCallback(
    (reportId: string, reason: string) => {
      setState((current) => {
        const target = current.reports.find((item) => item.id === reportId)
        const log: AuditEntry = {
          id: id(),
          action: "dismiss",
          target: target?.target ?? null,
          targetLabel: "Report closed",
          reason: reason.trim() || "No reason given",
          at: new Date().toISOString(),
          by: "Moderator (local)",
        }
        const next = {
          ...current,
          reports: current.reports.filter((item) => item.id !== reportId),
          log: [log, ...current.log].slice(0, 200),
        }
        writeJson(KEY, next)
        return next
      })
    },
    [],
  )

  const setRoleDisabled = useCallback(
    (role: RoleId, disabled: boolean, label: string) => {
      setState((current) => {
        const disabledRoles = disabled
          ? [...new Set([...current.disabledRoles, role])]
          : current.disabledRoles.filter((item) => item !== role)
        const log: AuditEntry = {
          id: id(),
          action: "settings",
          target: null,
          targetLabel: `Craft: ${label}`,
          reason: disabled
            ? "Hidden from the browse controls. Existing entries keep the craft and stay readable."
            : "Offered in the browse controls again.",
          at: new Date().toISOString(),
          by: "Moderator (local)",
        }
        const next = { ...current, disabledRoles, log: [log, ...current.log].slice(0, 200) }
        writeJson(KEY, next)
        return next
      })
    },
    [],
  )

  const setContact = useCallback(
    (contact: SiteContact) => {
      commit({ contact }, {
        action: "settings",
        target: null,
        targetLabel: "Contact details",
        reason: `Now ${contact.email}, ${contact.location}`,
      })
    },
    [commit],
  )

  const setCopy = useCallback(
    (slotId: string, value: string) => {
      setState((current) => {
        const copy = { ...current.copy }
        const fallback = copySlotById(slotId)?.defaultValue ?? ""
        // Storing a value identical to the default would make the admin screen
        // claim an override exists when nothing was really changed.
        if (value.trim() === "" || value === fallback) delete copy[slotId]
        else copy[slotId] = value

        const log: AuditEntry = {
          id: id(),
          action: "settings",
          target: null,
          targetLabel: copySlotById(slotId)?.label ?? slotId,
          reason: copy[slotId] ? "Copy edited" : "Copy reset to the shipped default",
          at: new Date().toISOString(),
          by: "Moderator (local)",
        }
        const next = { ...current, copy, log: [log, ...current.log].slice(0, 200) }
        writeJson(KEY, next)
        return next
      })
    },
    [],
  )

  const noticesFor = useCallback(
    (personId: string) =>
      state.notices.filter((notice) => notice.personId === personId),
    [state.notices],
  )

  const markNoticeRead = useCallback((noticeId: string) => {
    setState((current) => {
      const next = {
        ...current,
        notices: current.notices.map((notice) =>
          notice.id === noticeId && !notice.readAt
            ? { ...notice, readAt: new Date().toISOString() }
            : notice,
        ),
      }
      writeJson(KEY, next)
      return next
    })
  }, [])

  const appealNotice = useCallback((noticeId: string, text: string) => {
    setState((current) => {
      const next = {
        ...current,
        notices: current.notices.map((notice) =>
          notice.id === noticeId
            ? {
                ...notice,
                appeal: {
                  text: text.trim(),
                  at: new Date().toISOString(),
                  outcome: null,
                  outcomeReason: "",
                  decidedAt: null,
                },
              }
            : notice,
        ),
      }
      writeJson(KEY, next)
      return next
    })
  }, [])

  /**
   * Overturning actually reverses the original action.
   *
   * An appeal process that records a decision without undoing anything is
   * theatre. So overturning an unpublish republishes the entry and overturning
   * a suspension reinstates the profile, in the same operation that records
   * the outcome.
   */
  const decideAppeal = useCallback(
    (noticeId: string, outcome: "upheld" | "overturned", reason: string) => {
      setState((current) => {
        const notice = current.notices.find((item) => item.id === noticeId)
        if (!notice) return current
        const at = new Date().toISOString()
        const trimmed = reason.trim() || "No reason given"

        let hiddenWork = current.hiddenWork
        let suspendedPeople = current.suspendedPeople
        if (outcome === "overturned" && notice.target) {
          if (notice.target.kind === "work") {
            hiddenWork = hiddenWork.filter((workId) => workId !== notice.target!.id)
          } else {
            suspendedPeople = suspendedPeople.filter((id) => id !== notice.target!.id)
          }
        }

        const log: AuditEntry = {
          id: id(),
          action: outcome === "overturned" ? "republish" : "dismiss",
          target: notice.target,
          targetLabel: `Appeal ${outcome}: ${notice.targetLabel}`,
          reason: trimmed,
          at,
          // Named separately so the log shows the appeal was not decided by
          // whoever took the original action.
          by: "Appeal reviewer (local)",
        }

        const next = {
          ...current,
          hiddenWork,
          suspendedPeople,
          notices: current.notices.map((item) =>
            item.id === noticeId && item.appeal
              ? {
                  ...item,
                  appeal: { ...item.appeal, outcome, outcomeReason: trimmed, decidedAt: at },
                }
              : item,
          ),
          log: [log, ...current.log].slice(0, 200),
        }
        writeJson(KEY, next)
        return next
      })
    },
    [],
  )

  const resetAll = useCallback(() => persist(EMPTY_MODERATION), [persist])

  const value = useMemo<AdminContextValue>(
    () => ({
      state,
      isWorkHidden: (workId) => state.hiddenWork.includes(workId),
      isPersonSuspended: (personId) => state.suspendedPeople.includes(personId),
      isRoleDisabled: (role) => state.disabledRoles.includes(role),
      copy: (slotId) => state.copy[slotId] ?? copySlotById(slotId)?.defaultValue ?? "",
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
