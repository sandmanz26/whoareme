import type { ObjectId } from "mongodb"

export const ROLES = [
  "design", "engineering", "product", "data", "infra", "quality", "growth", "research",
] as const
export type RoleId = (typeof ROLES)[number]

/**
 * The launch scope, mirroring `ROLES[].status` in the SPA's taxonomy.
 *
 * A craft marked `soon` is a roadmap signal, not a deletion: its people and
 * entries stay in the database, keep their ids, and come back the day it flips
 * to `live`. What the status controls is what the public reads return, and
 * which crafts someone may register into - both of which the SPA already
 * scopes. Leaving the API unscoped would mean the two disagree about what the
 * directory contains the moment the SPA starts calling it.
 *
 * Separate from `siteSettings.disabledRoles`, which is a moderator turning a
 * craft off in the browse controls. This one is the product's own scope.
 */
export const ROLE_STATUS: Record<RoleId, "live" | "soon"> = {
  design: "live",
  engineering: "live",
  product: "live",
  infra: "live",
  data: "soon",
  quality: "soon",
  growth: "soon",
  research: "soon",
}

export const LIVE_ROLES = ROLES.filter((role) => ROLE_STATUS[role] === "live")
export const SOON_ROLES = ROLES.filter((role) => ROLE_STATUS[role] === "soon")

export function isRoleLive(role: string): boolean {
  return ROLE_STATUS[role as RoleId] === "live"
}

/**
 * Both kinds of topic, in one list, because they share one storage axis and
 * one quota. The SPA splits them into two filter controls; the database does
 * not care which kind a value is, only that `works.topics` holds valid ids.
 *
 * Kept in the same order as `CATEGORIES` in the SPA. They must agree: the
 * fixtures are generated from the SPA's list and validated against this one.
 */
export const TOPICS = [
  // Industries
  "saas", "ai", "banking", "finance", "erp", "energy", "mobility",
  "healthtech", "gaming", "climate", "security",
  // Practices
  "leadership", "design-ops", "devex", "accessibility", "hiring", "reliability",
] as const
export type TopicId = (typeof TOPICS)[number]

/**
 * Which kind each topic is. An industry carries a business case; a practice
 * does not. The database does not care, but a client rendering one filter
 * control per kind does, and deriving it from position in the array would
 * break the first time someone inserts a row.
 */
export const TOPIC_KIND: Record<TopicId, "industry" | "practice"> = {
  saas: "industry", ai: "industry", banking: "industry", finance: "industry",
  erp: "industry", energy: "industry", mobility: "industry", healthtech: "industry",
  gaming: "industry", climate: "industry", security: "industry",
  leadership: "practice", "design-ops": "practice", devex: "practice",
  accessibility: "practice", hiring: "practice", reliability: "practice",
}

export const BUSINESS_MODELS = [
  "b2b-saas", "consumer", "marketplace", "enterprise", "platform",
  "ecommerce", "agency", "open-source", "deep-tech", "public",
] as const
export type BusinessModelId = (typeof BUSINESS_MODELS)[number]

/** Two published entries per topic, per person. Enforced by a guarded update. */
export const TOPIC_QUOTA = 2

/**
 * Experience as bands, mirroring `src/data/experience.ts` exactly.
 *
 * Bounds are inclusive of `min` and exclusive of `max`, so they tile with no
 * gap and no overlap. `max: null` means unbounded - `Infinity` does not
 * survive a JSON round trip, and the taxonomy endpoint serves this list.
 */
export const EXPERIENCE_BANDS = [
  { id: "0-4", label: "Under 5 years", min: 0, max: 5 },
  { id: "5-9", label: "5 to 9 years", min: 5, max: 10 },
  { id: "10-14", label: "10 to 14 years", min: 10, max: 15 },
  { id: "15", label: "15 years or more", min: 15, max: null },
] as const

export const EXPERIENCE_BAND_IDS = EXPERIENCE_BANDS.map((band) => band.id)
export type ExperienceBandId = (typeof EXPERIENCE_BANDS)[number]["id"]

/**
 * The funnel the product is measured by.
 *
 * Counters only, and the same thirteen steps the SPA names. There is no event
 * stream, no identifier and no path: the question these answer is "do people
 * finish", not "did this person finish", and a behavioural record is not
 * needed to answer it. Two people who publish are indistinguishable here,
 * which is the point.
 */
export const FUNNEL_STEPS = [
  "signup_opened", "signup_step_2", "signup_step_3", "signup_completed",
  "entry_opened", "entry_template_chosen", "entry_saved_draft",
  "entry_publish_blocked", "entry_published",
  "search_used", "filter_used", "case_study_opened", "profile_opened",
] as const
export type FunnelStep = (typeof FUNNEL_STEPS)[number]

export const ACCESS_LEVELS = ["member", "moderator", "admin"] as const
export type AccessLevel = (typeof ACCESS_LEVELS)[number]

export const REPORT_REASONS = [
  "false-claim",
  "not-their-work",
  "confidential",
  "spam",
  "offensive",
  "other",
] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

export const MODERATION_ACTIONS = [
  "unpublish",
  "republish",
  "suspend",
  "reinstate",
  "dismiss",
  "settings",
  // An appeal that was decided. The reversal itself, when there is one, is
  // recorded separately as republish or reinstate, so the log reads as two
  // facts - somebody appealed and was answered, and the thing was put back -
  // rather than one row that has to be trusted to mean both.
  "appeal",
] as const
export type ModerationActionId = (typeof MODERATION_ACTIONS)[number]

export type ModerationTargetKind = "work" | "user"

/**
 * A report is a request for review, not a verdict, so it carries no decision
 * of its own. `resolvedAt` says a human looked; what they decided lives in the
 * action log, which is the record that has to survive.
 */
export interface ReportDoc {
  _id: ObjectId
  targetKind: ModerationTargetKind
  targetId: ObjectId
  reason: ReportReason
  note: string
  /** Salted daily hash of IP + UA, as used for traffic. Identifies nobody, and
   *  exists only to rate-limit one person filing the same report fifty times. */
  reporterHash: string
  resolvedAt: Date | null
  resolvedBy: ObjectId | null
  createdAt: Date
}

/**
 * The audit log. Append-only by contract: nothing in the API updates or
 * deletes a row here, because a moderation record that can be edited is not a
 * record. `reason` is required at the schema level for the same reason.
 */
export interface ModerationActionDoc {
  _id: ObjectId
  action: ModerationActionId
  targetKind: ModerationTargetKind | null
  targetId: ObjectId | null
  /** Denormalised so the log still reads if the target is later deleted. */
  targetLabel: string
  reason: string
  actorId: ObjectId
  actorSlug: string
  createdAt: Date
}

/**
 * One document, `_id: "site"`. Settings are a single small object read on
 * nearly every render, so splitting them across rows would buy nothing and
 * cost a join.
 */
export interface SiteSettingsDoc {
  _id: "site"
  contact: { email: string; location: string; responseTime: string }
  /** Overrides keyed by the copy-slot ids the SPA registers. */
  copy: Record<string, string>
  /** Crafts withdrawn from the browse controls. Not a content filter. */
  disabledRoles: RoleId[]
  updatedAt: Date
  updatedBy: ObjectId | null
}

export interface UserDoc {
  _id: ObjectId
  slug: string
  name: string
  email: string | null
  passwordHash: string | null
  emailVerifiedAt: Date | null
  /**
   * One live verification token at a time, stored only as its SHA-256 so a
   * database leak cannot be used to verify someone else's address. Cleared the
   * moment it is used.
   */
  emailVerifyTokenHash: string | null
  emailVerifyExpiresAt: Date | null
  role: RoleId
  title: string
  company: string
  location: string
  years: number
  /**
   * Working languages. A filter axis, not a profile decoration: the directory
   * is regional, and "who can run this workshop in Thai" is a question people
   * actually arrive with.
   */
  languages: string[]
  topics: TopicId[]
  skills: string[]
  openToWork: boolean
  photoUrl: string
  portfolioUrl: string
  pitch: string
  seeded: boolean
  status: "active" | "suspended" | "deleted"
  /**
   * Access level, separate from `role`. `role` is the person's craft and says
   * nothing about permissions; conflating the two would make every designer a
   * moderator of designers.
   */
  access: AccessLevel
  counts: { publishedWorks: number; topicUsage: Partial<Record<TopicId, number>> }
  searchBlob: string
  createdAt: Date
  updatedAt: Date
}

/** The author fields a card needs, snapshotted onto the work. */
export interface AuthorSnapshot {
  slug: string
  name: string
  title: string
  company: string
  photoUrl: string
  /**
   * Denormalised so the entry filters can match on experience and language.
   *
   * Every listing query matches on the work document alone - there is no join
   * to the author - so anything the entry grid filters by has to be carried
   * here. Same reason as `authorSuspended`, and the same cost: both are fanned
   * out when a profile changes.
   */
  years: number
  languages: string[]
}

export interface WorkDetail {
  label: string
  value: string
  proof?: boolean
}

export interface WorkSection {
  heading: string
  body: string
}

export interface WorkLink {
  label: string
  href: string
}

export interface WorkDoc {
  _id: ObjectId
  slug: string
  authorId: ObjectId
  author: AuthorSnapshot
  mode: "template" | "custom"
  role: RoleId
  topics: TopicId[]
  model: BusinessModelId | null
  skills: string[]
  title: string
  summary: string
  year: number
  duration: string
  scope: string
  problem: string
  approach: string
  outcome: string
  sections: WorkSection[]
  details: WorkDetail[]
  links: WorkLink[]
  stack: string[]
  thumbnailId: ObjectId | null
  status: "draft" | "published"
  /**
   * Mirrors the author's suspension, fanned out on suspend and reinstate.
   * Denormalised because every listing matches on the work document alone; a
   * $lookup per page to read one boolean would cost more than keeping it here.
   */
  authorSuspended?: boolean
  publishedAt: Date | null
  metrics: { opens: number }
  searchBlob: string
  createdAt: Date
  updatedAt: Date
}

export interface SessionDoc {
  _id: ObjectId
  userId: ObjectId
  tokenHash: string
  userAgent: string
  ip: string
  createdAt: Date
  expiresAt: Date
}

export interface TrafficEventDoc {
  _id: ObjectId
  ownerId: ObjectId
  type: "profile_view" | "work_open"
  workId: ObjectId | null
  day: string
  viewerHash: string
  createdAt: Date
}

export interface TrafficDailyDoc {
  _id: ObjectId
  ownerId: ObjectId
  day: string
  profile: number
  work: Record<string, number>
  total: number
}

/**
 * A statement of reasons, addressed to the person a decision was taken about.
 *
 * The audit log answers "what did we do"; this answers "what was done to me,
 * and why". They are the same decision read from opposite ends, and only this
 * end discharges the obligation - a reason filed where the author cannot read
 * it is bookkeeping, not accountability. So the notice is written in the same
 * transaction as the action, never as a follow-up somebody might remember.
 *
 * The appeal is embedded rather than a collection of its own: it is read only
 * ever with its notice, is at most one per notice, and bounded in size.
 */
export interface NoticeDoc {
  _id: ObjectId
  /** Who it is addressed to. */
  userId: ObjectId
  /** The audit row this restates, so the two ends can never drift apart. */
  actionId: ObjectId
  action: ModerationActionId
  targetKind: ModerationTargetKind | null
  targetId: ObjectId | null
  targetLabel: string
  reason: string
  /** Who decided. Kept so an appeal can refuse to be reviewed by them. */
  actorId: ObjectId
  createdAt: Date
  readAt: Date | null
  appeal: {
    text: string
    createdAt: Date
    outcome: "upheld" | "overturned" | null
    outcomeReason: string
    decidedAt: Date | null
    decidedBy: ObjectId | null
  } | null
}

/**
 * Funnel counters, one document per day.
 *
 * A day is the smallest bucket that answers "is completion getting better or
 * worse" without becoming a timeline of individual sessions. `$inc` on a
 * single document per day also means concurrent writes never race.
 */
export interface FunnelDayDoc {
  /** ISO day, `YYYY-MM-DD`. The natural key, so no second index is needed. */
  _id: string
  counts: Partial<Record<FunnelStep, number>>
  updatedAt: Date
}
