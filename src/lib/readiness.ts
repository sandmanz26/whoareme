import { COMMON_FIELDS, STORY_FIELDS } from "@/data/portfolioSchemas"
import { fieldsForTemplate, templateById } from "@/data/workTemplates"
import { TOPIC_QUOTA, type WorkDraft } from "@/data/account"
import { CATEGORIES } from "@/data/taxonomy"

/** "a design system", "an engineering leadership" - template labels are
 *  ordinary words, so a vowel-letter check is all this needs. */
function withIndefiniteArticle(noun: string): string {
  return `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`
}

export interface ReadinessItem {
  id: string
  label: string
  done: boolean
  /** Why it is required, shown when it is not done yet. */
  hint?: string
}

/**
 * What an entry still needs before it can be published, computed live.
 *
 * The same list drives the editor's readiness panel and the validation that
 * runs on publish, so the two can never disagree. Surfacing it while someone
 * types rather than at submit is the whole point: a wall of errors after
 * writing a case study is the most reliable way to lose the case study.
 */
export function readinessFor(
  draft: WorkDraft,
  topicUsage: Record<string, number>,
): ReadinessItem[] {
  const value = (name: string) => (draft.values[name] ?? "").trim()
  const guided = draft.mode === "template"

  const items: ReadinessItem[] = []

  const common = COMMON_FIELDS.filter((field) => field.required)
  items.push({
    id: "basics",
    label: "Title, summary, year and business model",
    done: common.every((field) => value(field.name)),
    hint: "The four things a reader needs before they decide to read on.",
  })

  items.push({
    id: "topics",
    label: "At least one topic",
    done: draft.topics.length > 0,
    hint: "Topics are how anyone finds this entry.",
  })

  items.push({
    id: "skills",
    label: "At least one skill",
    done: draft.skills.length > 0,
    hint: "The home page filters on these.",
  })

  if (guided) {
    items.push({
      id: "story",
      label: "Problem, what you did, what changed",
      done: STORY_FIELDS.every((field) => value(field.name)),
      hint: "The three paragraphs a reviewer actually reads.",
    })
    const required = fieldsForTemplate(draft.role, draft.template).filter((field) => field.required)
    if (required.length > 0) {
      items.push({
        id: "evidence",
        label: `Evidence for ${withIndefiniteArticle(templateById(draft.template)?.label.toLowerCase() ?? "case study")}`,
        done: required.every((field) => value(field.name)),
        hint: "The question this kind of work actually gets asked.",
      })
    }
  } else {
    items.push({
      id: "sections",
      label: "At least one section with a heading and body",
      done: draft.sections.some((section) => section.heading.trim() && section.body.trim()),
      hint: "Your own structure still needs content in it.",
    })
    items.push({
      id: "metrics",
      label: "At least one result",
      done: draft.metrics.some((metric) => metric.label.trim() && metric.value.trim()),
      hint: "The first one becomes the number on your card.",
    })
  }

  const figures = draft.figures ?? []
  if (figures.length > 0) {
    items.push({
      id: "figures",
      label: "Every figure has alt text and a caption",
      done: figures.every((figure) => figure.alt.trim() && figure.caption.trim()),
      hint: "An uncaptioned image is decoration.",
    })
  }

  const full = draft.topics.filter((topic) => (topicUsage[topic] ?? 0) >= TOPIC_QUOTA)
  if (full.length > 0) {
    items.push({
      id: "quota",
      label: "Topic quota",
      done: false,
      hint: `Already at ${TOPIC_QUOTA} published entries in ${full
        .map((topic) => CATEGORIES.find((category) => category.id === topic)?.label)
        .join(", ")}. Revert one to draft, or choose another topic.`,
    })
  }

  return items
}

export function isPublishable(items: readonly ReadinessItem[]): boolean {
  return items.every((item) => item.done)
}

export function completedCount(items: readonly ReadinessItem[]): number {
  return items.filter((item) => item.done).length
}
