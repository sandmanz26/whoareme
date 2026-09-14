import type { Work } from "@/data/work"
import { businessModelById } from "@/data/businessModels"
import { categoryById, roleById } from "@/data/taxonomy"

/**
 * "Similar" here means comparable to a hiring reviewer, not visually alike.
 *
 * Three axes, in the order they matter when someone is scanning for a
 * reference point: the languages and skills involved, the industry it shipped
 * in, and the business model behind it. Two payment systems built for an
 * on-prem bank and for a consumer app share a topic and almost nothing else,
 * which is why the model carries real weight.
 */
const WEIGHTS = { skill: 2, topic: 3, model: 3, role: 1 } as const

/**
 * Shared skills are capped. Without it a long skill list swamps the other two
 * axes, and every "similar" result is just the same craft again - which is
 * the least useful thing to show someone already reading that craft.
 */
const MAX_SCORED_SKILLS = 3

export interface SimilarWork {
  work: Work
  score: number
  /** Shown on the card, so the match never looks arbitrary. */
  reasons: string[]
}

function overlap<T>(a: readonly T[], b: readonly T[]): T[] {
  const other = new Set(b)
  return a.filter((item) => other.has(item))
}

export function scoreSimilarity(target: Work, candidate: Work): SimilarWork {
  const sharedSkills = overlap(target.skills, candidate.skills)
  const sharedTopics = overlap(target.topics, candidate.topics)
  const sameModel = Boolean(target.model) && target.model === candidate.model
  const sameRole = target.role === candidate.role

  const score =
    Math.min(sharedSkills.length, MAX_SCORED_SKILLS) * WEIGHTS.skill +
    sharedTopics.length * WEIGHTS.topic +
    (sameModel ? WEIGHTS.model : 0) +
    (sameRole ? WEIGHTS.role : 0)

  const reasons: string[] = []
  if (sharedSkills.length > 0) reasons.push(sharedSkills.slice(0, 2).join(" · "))
  if (sharedTopics.length > 0) {
    reasons.push(sharedTopics.map((topic) => categoryById(topic).label).join(" · "))
  }
  if (sameModel) reasons.push(businessModelById(candidate.model)!.label)
  if (reasons.length === 0 && sameRole) reasons.push(roleById(candidate.role).label)

  return { work: candidate, score, reasons }
}

export function similarWork(target: Work, pool: readonly Work[], limit = 3): SimilarWork[] {
  const ranked = pool
    .filter((item) => item.id !== target.id && item.authorId !== target.authorId)
    .map((item) => scoreSimilarity(target, item))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || b.work.year - a.work.year)

  // One entry per person: three projects by the same author is a worse
  // reference set than three projects by three people. The author's own
  // other work has its own section directly above.
  const seen = new Set<string>()
  const picked: SimilarWork[] = []
  for (const match of ranked) {
    if (seen.has(match.work.authorId)) continue
    seen.add(match.work.authorId)
    picked.push(match)
    if (picked.length === limit) break
  }
  return picked
}

/** Everything else this person has published, newest first. */
export function moreFromAuthor(target: Work, pool: readonly Work[], limit = 3): Work[] {
  return pool
    .filter((item) => item.authorId === target.authorId && item.id !== target.id)
    .sort((a, b) => b.year - a.year)
    .slice(0, limit)
}
