import type { Account, WorkDraft } from "@/data/account"
import { COMMON_FIELDS, STORY_FIELDS, schemaFor } from "@/data/portfolioSchemas"
import type { Work, WorkDetail, WorkLink } from "@/data/work"
import type { BusinessModelId } from "@/data/businessModels"

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
}

function labelForUrl(href: string, fallback: string): string {
  try {
    const { hostname } = new URL(href.startsWith("http") ? href : `https://${href}`)
    return hostname.replace(/^www\./, "")
  } catch {
    return fallback
  }
}

/**
 * Turns a stored draft into the same `Work` shape the seeded case studies use,
 * so the panel preview, the home grid, the index page and the case-study page
 * all render from one model rather than four near-identical ones.
 *
 * Both authoring modes converge here: a guided entry's evidence fields become
 * `details`, a custom entry's own metric rows become the same thing.
 */
export function workFromDraft(draft: WorkDraft, account: Account): Work {
  const value = (name: string) => (draft.values[name] ?? "").trim()

  const details: WorkDetail[] = []
  const links: WorkLink[] = draft.links
    .filter((link) => link.href.trim())
    .map((link) => ({
      href: link.href.trim(),
      label: link.label.trim() || labelForUrl(link.href, "Link"),
    }))
  const stack: string[] = []

  if (draft.mode === "template") {
    for (const field of schemaFor(draft.role).fields) {
      const raw = value(field.name)
      if (!raw) continue

      if (field.kind === "url") links.push({ label: labelForUrl(raw, field.label), href: raw })
      else if (field.kind === "tags") stack.push(...splitTags(raw))
      else details.push({ label: field.label, value: raw, proof: field.proof })
    }
  } else {
    for (const metric of draft.metrics) {
      if (!metric.label.trim() || !metric.value.trim()) continue
      details.push({ label: metric.label.trim(), value: metric.value.trim(), proof: true })
    }
  }

  const sections =
    draft.mode === "custom"
      ? draft.sections.filter((section) => section.heading.trim() && section.body.trim())
      : undefined

  return {
    id: draft.id,
    authorId: account.id,
    role: draft.role,
    topics: draft.topics,
    model: (value("model") || undefined) as BusinessModelId | undefined,
    skills: draft.skills,
    title: value("title") || "Untitled project",
    summary: value("summary"),
    year: Number(value("year")) || new Date().getFullYear(),
    duration: value("duration"),
    scope: value("scope"),
    problem: draft.mode === "template" ? value("problem") : "",
    approach: draft.mode === "template" ? value("approach") : "",
    outcome: draft.mode === "template" ? value("outcome") : "",
    stack: [...new Set([...stack, ...draft.skills])],
    links,
    details,
    thumbnail: draft.thumbnail,
    sections,
  }
}

/** Every field the editor validates, in the order it renders them. */
export function requiredFieldsFor(draft: WorkDraft) {
  return draft.mode === "template"
    ? [...COMMON_FIELDS, ...STORY_FIELDS, ...schemaFor(draft.role).fields]
    : COMMON_FIELDS
}

/** 0-1 completeness, used for the nudge in the panel. */
export function draftCompleteness(draft: WorkDraft): number {
  const fields = requiredFieldsFor(draft)
  const filled = fields.filter((field) => (draft.values[field.name] ?? "").trim()).length

  const extras =
    draft.mode === "custom"
      ? [
          draft.sections.some((s) => s.heading.trim() && s.body.trim()),
          draft.metrics.some((m) => m.label.trim() && m.value.trim()),
        ]
      : []
  const bonus = [draft.topics.length > 0, draft.skills.length > 0, ...extras]

  const total = fields.length + bonus.length
  return total === 0 ? 0 : (filled + bonus.filter(Boolean).length) / total
}
