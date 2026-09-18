import type { Person } from "@/data/people"
import { proofOf, type Work } from "@/data/work"
import { categoryById, type CategoryId } from "@/data/taxonomy"
import type { Target } from "@/data/admin"

export type Severity = "high" | "medium" | "low"

export const RULE_LABELS: Record<string, string> = {
  "no-proof": "Entries with no proof point",
  "thin-entry": "Entries too short to judge",
  "placeholder-link": "Entries linking to a placeholder",
  "orphan-entry": "Entries with no author in the directory",
  "quota-breach": "People over the two-per-topic cap",
  "no-published-work": "Profiles with no published work",
}

export interface Flag {
  /** Stable across runs, so dismissing one keeps it dismissed. */
  key: string
  ruleId: string
  severity: Severity
  target: Target
  targetLabel: string
  /** What is wrong, in the reviewer's language, with the specifics filled in. */
  detail: string
}

const TOPIC_QUOTA = 2

/**
 * Rules the system can check without an opinion.
 *
 * Every rule here is mechanical: a count, a missing field, a malformed URL.
 * That is a deliberate limit. A rule like "this result sounds exaggerated"
 * would fill the queue with false positives and quietly turn moderation into
 * taste, which is the opposite of what this product claims to be. Judgement
 * about whether a claim is honest belongs to a human looking at a report, not
 * to a heuristic.
 *
 * Severity answers "how fast does this need a human", not "how bad is the
 * person". A quota breach is high because it breaks a load-bearing product
 * rule; a bio-less profile is not a rule at all and never appears here.
 */
export function flagsFor(work: readonly Work[], people: readonly Person[]): Flag[] {
  const flags: Flag[] = []
  const byId = new Map(people.map((person) => [person.id, person]))
  const labelFor = (item: Work) => item.title

  // ── Entries with nothing to verify ───────────────────────────────────
  for (const item of work) {
    if (proofOf(item).length === 0) {
      flags.push({
        key: `no-proof:${item.id}`,
        ruleId: "no-proof",
        severity: "high",
        target: { kind: "work", id: item.id },
        targetLabel: labelFor(item),
        detail:
          "No proof point. The entry claims an outcome but gives no figure a reviewer can weigh.",
      })
    }

    const body = item.sections?.length
      ? item.sections.map((section) => section.body).join(" ")
      : [item.problem, item.approach, item.outcome].join(" ")
    const words = body.trim().split(/\s+/).filter(Boolean).length
    if (words > 0 && words < 60) {
      flags.push({
        key: `thin-entry:${item.id}`,
        ruleId: "thin-entry",
        severity: "medium",
        target: { kind: "work", id: item.id },
        targetLabel: labelFor(item),
        detail: `Only ${words} words across the whole case study. Too little to judge the decisions.`,
      })
    }

    // A link that goes nowhere is worse than no link: it implies evidence.
    const dead = item.links.filter(
      (link) => !/^https?:\/\//i.test(link.href) || /example\.(com|org)/i.test(link.href),
    )
    if (dead.length > 0) {
      flags.push({
        key: `placeholder-link:${item.id}`,
        ruleId: "placeholder-link",
        severity: "medium",
        target: { kind: "work", id: item.id },
        targetLabel: labelFor(item),
        detail:
          dead.length === 1
            ? `The link "${dead[0].label}" is a placeholder or not a URL.`
            : `${dead.length} links are placeholders or not URLs: ${dead.map((link) => link.label).join(", ")}.`,
      })
    }

    if (!byId.has(item.authorId)) {
      flags.push({
        key: `orphan-entry:${item.id}`,
        ruleId: "orphan-entry",
        severity: "high",
        target: { kind: "work", id: item.id },
        targetLabel: labelFor(item),
        detail: `Author "${item.authorId}" is not in the directory. The entry has no one accountable for it.`,
      })
    }
  }

  // ── The quota, which is a product rule and so ranks high ─────────────
  const usage = new Map<string, number>()
  for (const item of work) {
    for (const topic of item.topics) {
      const key = `${item.authorId}|${topic}`
      usage.set(key, (usage.get(key) ?? 0) + 1)
    }
  }
  for (const [key, count] of usage) {
    if (count <= TOPIC_QUOTA) continue
    const [authorId, topic] = key.split("|")
    const person = byId.get(authorId)
    flags.push({
      key: `quota:${key}`,
      ruleId: "quota-breach",
      severity: "high",
      target: { kind: "person", id: authorId },
      targetLabel: person?.name ?? authorId,
      detail: `${count} published entries in ${categoryById(topic as CategoryId).label}, and the cap is ${TOPIC_QUOTA}.`,
    })
  }

  // ── People the directory lists but cannot evidence ───────────────────
  const authored = new Set(work.map((item) => item.authorId))
  for (const person of people) {
    if (authored.has(person.id)) continue
    flags.push({
      key: `no-work:${person.id}`,
      ruleId: "no-published-work",
      severity: "low",
      target: { kind: "person", id: person.id },
      targetLabel: person.name,
      detail: "Listed in the directory with no published work. A profile with nothing in it.",
    })
  }

  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 }
  return flags.sort((a, b) => order[a.severity] - order[b.severity] || a.key.localeCompare(b.key))
}
