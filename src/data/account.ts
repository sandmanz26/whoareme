import type { CategoryId, RoleId } from "./taxonomy"
import type { WorkLink, WorkSection } from "./work"

export interface Account {
  id: string
  name: string
  email: string
  location: string
  role: RoleId
  title: string
  years: string
  topics: CategoryId[]
  portfolio: string
  pitch: string
  createdAt: string
}

/** Guided = the role's evidence template. Custom = headings the author writes. */
export type WorkMode = "template" | "custom"

/**
 * A portfolio entry as the panel stores it: the role chosen for *this entry*
 * (which need not match the profile craft), plus a flat bag of values keyed by
 * schema field name. Flat means adding a field to a schema needs no migration.
 */
export interface WorkDraft {
  id: string
  role: RoleId
  mode: WorkMode
  topics: CategoryId[]
  skills: string[]
  values: Record<string, string>
  links: WorkLink[]
  /** Only used in custom mode. */
  sections: WorkSection[]
  /** Only used in custom mode - the author's own metric rows. */
  metrics: Array<{ label: string; value: string }>
  thumbnail?: string
  updatedAt: string
  published: boolean
}

/** Two published entries per topic, per person. */
export const TOPIC_QUOTA = 2

export function emptyDraft(role: RoleId, mode: WorkMode): WorkDraft {
  return {
    id: `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    role,
    mode,
    topics: [],
    skills: [],
    values: {},
    links: [],
    sections:
      mode === "custom"
        ? [
            { heading: "Context", body: "" },
            { heading: "What I did", body: "" },
            { heading: "Result", body: "" },
          ]
        : [],
    metrics: mode === "custom" ? [{ label: "", value: "" }] : [],
    updatedAt: new Date().toISOString(),
    published: false,
  }
}

/**
 * How many published entries a person already has in a topic, ignoring the
 * entry being edited so re-publishing it never trips its own quota.
 */
export function topicUsage(
  drafts: readonly WorkDraft[],
  exceptId?: string,
): Record<string, number> {
  const usage: Record<string, number> = {}
  for (const draft of drafts) {
    if (!draft.published || draft.id === exceptId) continue
    for (const topic of draft.topics) usage[topic] = (usage[topic] ?? 0) + 1
  }
  return usage
}
