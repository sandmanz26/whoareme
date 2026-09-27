export const ROLES = [
  "design", "engineering", "product", "data", "infra", "quality", "growth", "research",
] as const
export type RoleId = (typeof ROLES)[number]

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

export const TOPICS = [
  "saas", "ai", "banking", "finance", "erp", "energy", "mobility",
  "healthtech", "gaming", "climate", "security",
  "leadership", "design-ops", "devex", "accessibility", "hiring", "reliability",
] as const
export type TopicId = (typeof TOPICS)[number]

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

export const EXPERIENCE_BANDS = [
  { id: "0-4",  label: "Under 5 years",    min: 0,  max: 5  },
  { id: "5-9",  label: "5 to 9 years",     min: 5,  max: 10 },
  { id: "10-14", label: "10 to 14 years",  min: 10, max: 15 },
  { id: "15",   label: "15 years or more", min: 15, max: null },
] as const

export const EXPERIENCE_BAND_IDS = EXPERIENCE_BANDS.map((b) => b.id)
export type ExperienceBandId = (typeof EXPERIENCE_BANDS)[number]["id"]

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
  "false-claim", "not-their-work", "confidential", "spam", "offensive", "other",
] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

export const MODERATION_ACTIONS = [
  "unpublish", "republish", "suspend", "reinstate", "dismiss", "settings", "appeal",
] as const
export type ModerationActionId = (typeof MODERATION_ACTIONS)[number]

export type ModerationTargetKind = "work" | "user"
