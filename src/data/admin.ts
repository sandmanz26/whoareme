import type { RoleId } from "./taxonomy"

/**
 * Moderation state, and the site settings an admin can change.
 *
 * Everything here is an **overlay**. The seeded fixtures are read-only, so a
 * moderator does not edit them; they record decisions that are applied on top
 * at render time. That keeps rule 2 intact (the SPA works with no API), makes
 * every action reversible by construction, and means the audit log is the
 * source of truth rather than a side effect of mutating data.
 */

export type TargetKind = "work" | "person"

export interface Target {
  kind: TargetKind
  id: string
}

export function sameTarget(a: Target, b: Target): boolean {
  return a.kind === b.kind && a.id === b.id
}

export function targetKey(target: Target): string {
  return `${target.kind}:${target.id}`
}

// ── Reports, raised by readers ──────────────────────────────────────────

export const REPORT_REASONS = [
  { id: "false-claim", label: "The result looks made up" },
  { id: "not-their-work", label: "This is not their work" },
  { id: "confidential", label: "This should not be public" },
  { id: "spam", label: "Spam or advertising" },
  { id: "offensive", label: "Offensive or harassing" },
  { id: "other", label: "Something else" },
] as const

export type ReportReasonId = (typeof REPORT_REASONS)[number]["id"]

export function reportReasonLabel(id: ReportReasonId): string {
  return REPORT_REASONS.find((reason) => reason.id === id)?.label ?? id
}

export interface Report {
  id: string
  target: Target
  reason: ReportReasonId
  /** The reporter's own words. Optional, and often the only useful part. */
  note: string
  createdAt: string
}

// ── Actions and the audit log ───────────────────────────────────────────

export const MODERATION_ACTIONS = [
  { id: "unpublish", label: "Unpublished", undo: "republish" },
  { id: "republish", label: "Republished", undo: "unpublish" },
  { id: "suspend", label: "Suspended", undo: "reinstate" },
  { id: "reinstate", label: "Reinstated", undo: "suspend" },
  { id: "dismiss", label: "Reviewed, no action", undo: null },
  { id: "settings", label: "Changed site settings", undo: null },
] as const

export type ModerationActionId = (typeof MODERATION_ACTIONS)[number]["id"]

export function actionLabel(id: ModerationActionId): string {
  return MODERATION_ACTIONS.find((action) => action.id === id)?.label ?? id
}

/**
 * One line of the audit log.
 *
 * `reason` is required by the store rather than optional, because a moderation
 * record without a reason is the thing that makes moderation unaccountable.
 * `targetLabel` is denormalised so the log still reads correctly if the entry
 * it refers to is later removed from the fixtures.
 */
export interface AuditEntry {
  id: string
  action: ModerationActionId
  target: Target | null
  targetLabel: string
  reason: string
  at: string
  by: string
}

// ── Site settings ───────────────────────────────────────────────────────

export interface SiteContact {
  email: string
  location: string
  responseTime: string
}

export const DEFAULT_CONTACT: SiteContact = {
  email: "hello@whoareyou.directory",
  location: "Jakarta, ID",
  responseTime: "We answer within two working days.",
}

/**
 * The notice a decision owes the person it affects.
 *
 * Recording a reason in a log the author cannot see is not accountability, it
 * is bookkeeping. Every hosting provider has to give the affected person a
 * statement of reasons and a route to contest it, and that obligation has no
 * small-company exemption - so the notice is part of taking the action, not a
 * follow-up someone might remember.
 */
export interface Notice {
  id: string
  /** Who it is addressed to. */
  personId: string
  action: ModerationActionId
  target: Target | null
  targetLabel: string
  reason: string
  at: string
  readAt: string | null
  appeal: Appeal | null
}

export interface Appeal {
  text: string
  at: string
  /** Set when a moderator has decided. */
  outcome: "upheld" | "overturned" | null
  outcomeReason: string
  decidedAt: string | null
}

export interface ModerationState {
  /** Entry ids a moderator has taken off the public grids. */
  hiddenWork: string[]
  /** People whose profile and work are withheld. */
  suspendedPeople: string[]
  /** Queue keys marked reviewed, so a dismissed flag stops reappearing. */
  reviewed: string[]
  reports: Report[]
  log: AuditEntry[]
  /** Statements of reasons, addressed to the people they concern. */
  notices: Notice[]
  /**
   * Crafts hidden from the browse controls. Deliberately *not* a content
   * filter: entries keep their craft label and stay readable. Turning a craft
   * off says "stop offering this as a way in", not "delete this work".
   */
  disabledRoles: RoleId[]
  contact: SiteContact
  /** Overrides for the editable strings registered in `siteCopy.ts`. */
  copy: Record<string, string>
}

export const EMPTY_MODERATION: ModerationState = {
  hiddenWork: [],
  suspendedPeople: [],
  reviewed: [],
  reports: [],
  log: [],
  notices: [],
  disabledRoles: [],
  contact: DEFAULT_CONTACT,
  copy: {},
}
