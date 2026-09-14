/**
 * The two axes people browse by.
 *
 * `roles` answer "what do they do" and act as a filter.
 * `categories` answer "where do they do it" and act as the directory tabs.
 * Both are plain data so the whole app stays backend-free and testable.
 */

export const ROLES = [
  { id: "design", label: "Designer", blurb: "Product, brand, motion" },
  { id: "engineering", label: "Developer", blurb: "Frontend, backend, mobile" },
  { id: "product", label: "Product", blurb: "PM, owner, strategy" },
  { id: "data", label: "Data & AI", blurb: "ML, analytics, research" },
  { id: "infra", label: "DevOps", blurb: "Platform, SRE, cloud" },
  { id: "quality", label: "QA", blurb: "Automation, reliability" },
  { id: "growth", label: "Growth", blurb: "Marketing, lifecycle" },
  { id: "research", label: "Research", blurb: "UXR, discovery" },
] as const

export type RoleId = (typeof ROLES)[number]["id"]

/**
 * Topics come in two kinds, and the distinction is the point.
 *
 * `industry` answers "what market did this ship into" - it carries a business
 * case almost by definition. `practice` answers "what discipline was this" -
 * design ops, hiring, reliability. That work is real and often senior, but it
 * has no revenue line to point at, so filing it under an industry either
 * flatters it with a business case it never had or buries it entirely.
 *
 * Keeping both on one axis (rather than adding a fourth) means `Work.topics`
 * does not change shape, the two-per-topic quota keeps working unmodified, and
 * a person whose year was half ERP and half design ops can say exactly that.
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
  { id: "gaming", label: "Gaming", tint: "bg-pop-violet text-paper", kind: "industry", extra: true },
  { id: "climate", label: "Climate", tint: "bg-pop-lime", kind: "industry", extra: true },
  { id: "security", label: "Cybersecurity", tint: "bg-ink", kind: "industry", extra: true },
  // ── Practice ──────────────────────────────────────────────────────
  { id: "design-ops", label: "Design Ops", tint: "bg-pop-pink", kind: "practice", extra: true },
  { id: "devex", label: "Developer Experience", tint: "bg-pop-sky", kind: "practice", extra: true },
  { id: "accessibility", label: "Accessibility", tint: "bg-pop-lime", kind: "practice", extra: true },
  { id: "hiring", label: "Hiring & Teams", tint: "bg-pop-tangerine", kind: "practice", extra: true },
  { id: "reliability", label: "Reliability", tint: "bg-ink", kind: "practice", extra: true },
] as const

export type CategoryId = (typeof CATEGORIES)[number]["id"]
export type CategoryKind = (typeof CATEGORIES)[number]["kind"]

export const PRIMARY_CATEGORIES = CATEGORIES.filter((c) => !("extra" in c && c.extra))
export const EXTRA_CATEGORIES = CATEGORIES.filter((c) => "extra" in c && c.extra)

export const INDUSTRY_CATEGORIES = CATEGORIES.filter((c) => c.kind === "industry")
export const PRACTICE_CATEGORIES = CATEGORIES.filter((c) => c.kind === "practice")

/** Dropdown groups, so a practice topic is never mistaken for a market. */
export const CATEGORY_GROUPS = [
  {
    label: "Industry",
    hint: "The market it shipped into",
    options: INDUSTRY_CATEGORIES,
  },
  {
    label: "Practice",
    hint: "Discipline work that has no revenue line of its own",
    options: PRACTICE_CATEGORIES,
  },
] as const

export function categoryById(id: CategoryId) {
  return CATEGORIES.find((category) => category.id === id)!
}

export function isPracticeTopic(id: CategoryId): boolean {
  return categoryById(id).kind === "practice"
}

export function roleById(id: RoleId) {
  return ROLES.find((role) => role.id === id)!
}
