import type { BusinessModelId } from "./businessModels"
import type { CategoryId, RoleId } from "./taxonomy"

export interface WorkLink {
  label: string
  href: string
}

export interface WorkSection {
  heading: string
  body: string
}

export interface WorkDetail {
  label: string
  value: string
  /** Proof points surface on the card; everything else lives in the case study. */
  proof?: boolean
}

/**
 * A piece of real work - the unit this product is actually about.
 *
 * Deliberately not a picture with a like count. Every entry has to state the
 * problem, what the person did, and what changed as a result; the role-specific
 * `details` are where a developer's p95 and a designer's task-success rate live
 * side by side without pretending they are the same thing.
 */
export interface Work {
  id: string
  authorId: string
  role: RoleId
  topics: CategoryId[]
  /** Third similarity axis alongside skills and topics. */
  model?: BusinessModelId
  title: string
  summary: string
  year: number
  duration: string
  scope: string
  problem: string
  approach: string
  outcome: string
  stack: string[]
  /** Filterable on the home page, unlike free-text stack notes. */
  skills: string[]
  links: WorkLink[]
  details: WorkDetail[]
  /** Data URL when the author uploaded one; otherwise the cover is generated. */
  thumbnail?: string
  /**
   * Free-form entries replace problem/approach/outcome with their own headings.
   * Guided entries leave this empty.
   */
  sections?: WorkSection[]
}

export function proofOf(work: Work): WorkDetail[] {
  return work.details.filter((detail) => detail.proof && detail.value.trim())
}

/** The single number a card leads with, if the author gave one. */
export function headlineProof(work: Work): WorkDetail | undefined {
  return proofOf(work)[0]
}
