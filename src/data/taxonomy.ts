/**
 * The two axes people browse by.
 *
 * `roles` answer "what do they do" and act as a filter.
 * `categories` answer "where do they do it" and act as the directory tabs.
 * Both are plain data so the whole app stays backend-free and testable.
 */

/**
 * Four crafts are open; four are announced.
 *
 * Launching narrow is a deliberate supply decision. A craft with nine entries
 * reads as abandoned, and a reviewer who filters to it and finds three thin
 * profiles learns the wrong thing about the whole directory. Better to open
 * the crafts that have depth and say plainly when the rest arrive.
 *
 * `status: "soon"` is a roadmap signal, not a filter: the craft appears in the
 * grid, labelled, and cannot be selected. The seeded entries for those crafts
 * stay in `portfolios.ts` and in the API fixtures - the writing is done, so
 * opening one is a one-word change here rather than a content project.
 */
export const ROLES = [
  { id: "design", label: "Designer", blurb: "Product, brand, motion", status: "live" },
  { id: "engineering", label: "Developer", blurb: "Frontend, backend, mobile", status: "live" },
  { id: "product", label: "Product", blurb: "PM, owner, strategy", status: "live" },
  { id: "infra", label: "DevOps", blurb: "Platform, SRE, cloud", status: "live" },
  { id: "data", label: "Data & AI", blurb: "ML, analytics, research", status: "soon" },
  { id: "quality", label: "QA", blurb: "Automation, reliability", status: "soon" },
  { id: "growth", label: "Growth", blurb: "Marketing, lifecycle", status: "soon" },
  { id: "research", label: "Research", blurb: "UXR, discovery", status: "soon" },
] as const

export type RoleId = (typeof ROLES)[number]["id"]
export type RoleStatus = (typeof ROLES)[number]["status"]

/** The crafts you can file work under, filter by, or sign up as. */
export const LIVE_ROLES = ROLES.filter((role) => role.status === "live")
export const SOON_ROLES = ROLES.filter((role) => role.status === "soon")

export function isRoleLive(id: RoleId): boolean {
  return ROLES.find((role) => role.id === id)?.status === "live"
}

/**
 * Topics come in two kinds, and the distinction is the point.
 *
 * `industry` answers "what market did this ship into" - it carries a business
 * case almost by definition. `practice` answers "what discipline was this" -
 * design ops, hiring, reliability. That work is real and often senior, but it
 * has no revenue line to point at, so filing it under an industry either
 * flatters it with a business case it never had or buries it entirely.
 *
 * They share one storage axis - `Work.topics` holds both - so the two-per-topic
 * quota keeps working unmodified and a person whose year was half ERP and half
 * design ops can say exactly that. They are two separate *controls* though,
 * because an industry and a practice answer different questions and a reader
 * picking one is not choosing against the other.
 */
export const CATEGORIES = [
  { id: "saas", label: "SaaS", tint: "bg-pop-lime", kind: "industry" },
  { id: "ai", label: "AI", tint: "bg-pop-violet text-paper", kind: "industry" },
  { id: "leadership", label: "Leadership", tint: "bg-pop-pink", kind: "practice" },
  { id: "banking", label: "Banking", tint: "bg-pop-sky", kind: "industry" },
  { id: "finance", label: "Finance", tint: "bg-pop-tangerine", kind: "industry" },
  { id: "erp", label: "ERP", tint: "bg-ink", kind: "industry" },
  { id: "energy", label: "Gas & Oil", tint: "bg-pop-lime", kind: "industry" },
  { id: "mobility", label: "Transportation", tint: "bg-pop-sky", kind: "industry" },
  // Everything below the fold of the tab rail, revealed by "See more".
  { id: "healthtech", label: "Health Tech", tint: "bg-pop-pink", kind: "industry", extra: true },
  {
    id: "gaming",
    label: "Gaming",
    tint: "bg-pop-violet text-paper",
    kind: "industry",
    extra: true,
  },
  { id: "climate", label: "Climate", tint: "bg-pop-lime", kind: "industry", extra: true },
  { id: "security", label: "Cybersecurity", tint: "bg-ink", kind: "industry", extra: true },
  // ── Practice ──────────────────────────────────────────────────────
  { id: "design-ops", label: "Design Ops", tint: "bg-pop-pink", kind: "practice", extra: true },
  { id: "devex", label: "Developer Experience", tint: "bg-pop-sky", kind: "practice", extra: true },
  {
    id: "accessibility",
    label: "Accessibility",
    tint: "bg-pop-lime",
    kind: "practice",
    extra: true,
  },
  {
    id: "hiring",
    label: "Hiring & Teams",
    tint: "bg-pop-tangerine",
    kind: "practice",
    extra: true,
  },
  { id: "reliability", label: "Reliability", tint: "bg-ink", kind: "practice", extra: true },
] as const

export type CategoryId = (typeof CATEGORIES)[number]["id"]
export type CategoryKind = (typeof CATEGORIES)[number]["kind"]

export const PRIMARY_CATEGORIES = CATEGORIES.filter((c) => !("extra" in c && c.extra))
export const EXTRA_CATEGORIES = CATEGORIES.filter((c) => "extra" in c && c.extra)

export const INDUSTRY_CATEGORIES = CATEGORIES.filter((c) => c.kind === "industry")
export const PRACTICE_CATEGORIES = CATEGORIES.filter((c) => c.kind === "practice")

export function categoryById(id: CategoryId) {
  return CATEGORIES.find((category) => category.id === id)!
}

export function isPracticeTopic(id: CategoryId): boolean {
  return categoryById(id).kind === "practice"
}

export function roleById(id: RoleId) {
  return ROLES.find((role) => role.id === id)!
}
