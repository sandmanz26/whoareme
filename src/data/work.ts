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

/**
 * An image inside a case study.
 *
 * `alt` and `caption` are both required, and that is a product decision rather
 * than an oversight: an uncaptioned screenshot is decoration, and this product
 * exists to stop decoration winning. The caption has to say what the reader is
 * looking at and why it is here.
 *
 * `width` and `height` are the intrinsic pixel dimensions, captured at upload.
 * Layout is chosen from the aspect ratio, so it has to be known before the
 * image loads or the page reflows as each figure arrives.
 */
export interface WorkFigure {
  src: string
  alt: string
  caption: string
  width: number
  height: number
  /**
   * Which chapter it sits under: "problem" | "approach" | "outcome" for a
   * guided entry, or the section heading for a free-form one.
   */
  section: string
  /**
   * Opt a chapter's figures into a slider. Stored per figure rather than as a
   * per-chapter map so the draft stays a flat bag - a chapter renamed in a
   * free-form entry cannot leave a dangling key behind. A group slides if any
   * member asks to.
   */
  display?: "slider"
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
  /** Which template shaped the entry, for the label on the case study. */
  template?: string
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
  /** Evidence images, placed under the chapter each one belongs to. */
  figures?: WorkFigure[]
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
