import type { Document, Filter, ObjectId } from "mongodb"
import { LIVE_ROLES, type WorkDoc } from "../../types.js"
import { escapeRegex } from "../../lib/text.js"
import { experienceCondition, languageCondition } from "../../lib/facets.js"

/** Fields a card needs. Bodies of text are left out of list responses. */
export const CARD_PROJECTION: Document = {
  slug: 1,
  title: 1,
  summary: 1,
  role: 1,
  topics: 1,
  model: 1,
  skills: 1,
  year: 1,
  thumbnailId: 1,
  author: 1,
  publishedAt: 1,
  "metrics.opens": 1,
  details: { $filter: { input: "$details", as: "d", cond: { $eq: ["$$d.proof", true] } } },
}

export interface ListFilters {
  role?: string
  topic?: string
  model?: string
  skills: string[]
  /** Experience band ids, OR-ed. Matched against the author snapshot. */
  experience: string[]
  /** Languages, OR-ed. Matched against the author snapshot. */
  language: string[]
  tokens: string[]
}

/**
 * The public listing match.
 *
 * `role: { $in: LIVE_ROLES }` is the launch scope, and it is applied here
 * rather than at the edge so every public read goes through it - a route that
 * forgot would otherwise show entries from a craft the rest of the site says
 * is not open yet. Entries in a craft that is still `soon` keep their rows and
 * their ids; they simply are not served until the craft goes live.
 */
export function buildWorkMatch(filters: ListFilters): Filter<WorkDoc> {
  const match: Record<string, unknown> = {
    status: "published",
    authorSuspended: { $ne: true },
    role: { $in: LIVE_ROLES },
  }
  const and: Document[] = []

  // An explicit craft narrows within the live set; asking for one that is not
  // live returns nothing, which is the same answer the SPA gives.
  if (filters.role) and.push({ role: filters.role })
  if (filters.topic) match.topics = filters.topic
  if (filters.model) match.model = filters.model
  if (filters.skills.length > 0) match.skills = { $all: filters.skills }

  const experience = experienceCondition(filters.experience, "author.years")
  if (experience) and.push(experience)
  const language = languageCondition(filters.language, "author.languages")
  if (language) and.push(language)

  // AND-ed substrings, so extra words narrow. See DATABASE.md §6 for why this
  // is a regex on a denormalised blob rather than $text.
  for (const token of filters.tokens) {
    and.push({ searchBlob: { $regex: escapeRegex(token) } })
  }

  if (and.length > 0) match.$and = and

  return match as Filter<WorkDoc>
}

const SORTS: Record<string, Document> = {
  recent: { publishedAt: -1, _id: -1 },
  title: { title: 1, _id: 1 },
  role: { role: 1, publishedAt: -1 },
  popular: { "metrics.opens": -1, _id: -1 },
}

/**
 * Page, total and facets in one round trip. Facets are computed from the
 * filtered set, so the chip row never offers a filter that returns nothing.
 */
export function listWorkPipeline(
  filters: ListFilters,
  sort: string,
  skip: number,
  limit: number,
): Document[] {
  return [
    { $match: buildWorkMatch(filters) },
    {
      $facet: {
        items: [{ $sort: SORTS[sort] ?? SORTS.recent! }, { $skip: skip }, { $limit: limit }, { $project: CARD_PROJECTION }],
        total: [{ $count: "value" }],
        skills: [
          { $unwind: "$skills" },
          { $group: { _id: "$skills", n: { $sum: 1 } } },
          { $sort: { n: -1, _id: 1 } },
          { $limit: 14 },
        ],
        models: [{ $group: { _id: "$model", n: { $sum: 1 } } }, { $sort: { n: -1 } }],
        // Counted from the filtered set, like the others, so the filter bar
        // never offers a language or a band that would return nothing.
        languages: [
          { $unwind: "$author.languages" },
          { $group: { _id: "$author.languages", n: { $sum: 1 } } },
          { $sort: { n: -1, _id: 1 } },
        ],
        experience: [
          {
            $bucket: {
              groupBy: { $ifNull: ["$author.years", 0] },
              // Boundaries are the band minimums; `default` catches nothing,
              // because 0 is the first boundary and years cannot be negative.
              boundaries: [0, 5, 10, 15, Number.MAX_SAFE_INTEGER],
              default: "unknown",
              output: { n: { $sum: 1 } },
            },
          },
        ],
      },
    },
    { $addFields: { total: { $ifNull: [{ $first: "$total.value" }, 0] } } },
  ]
}

/**
 * Comparable work, scored on three axes.
 *
 * Mirrors `src/lib/similar.ts` on the client exactly: shared skills capped at
 * three so a long skill list cannot swamp topic and business model, then one
 * result per author because three projects by one person is a worse reference
 * set than three by three people.
 */
export function similarWorkPipeline(target: WorkDoc, limit = 3): Document[] {
  const prefilter: Document[] = [{ skills: { $in: target.skills } }, { topics: { $in: target.topics } }]
  if (target.model) prefilter.push({ model: target.model })

  return [
    {
      $match: {
        status: "published",
        authorSuspended: { $ne: true },
        role: { $in: LIVE_ROLES },
        _id: { $ne: target._id },
        authorId: { $ne: target.authorId },
        // Index-selected candidates only — without this every published entry
        // is scored on every detail-page load.
        $or: prefilter,
      },
    },
    {
      $addFields: {
        sharedSkills: { $setIntersection: ["$skills", target.skills] },
        sharedTopics: { $setIntersection: ["$topics", target.topics] },
      },
    },
    {
      $addFields: {
        score: {
          $add: [
            { $multiply: [{ $min: [{ $size: "$sharedSkills" }, 3] }, 2] },
            { $multiply: [{ $size: "$sharedTopics" }, 3] },
            { $cond: [{ $eq: ["$model", target.model ?? "__none__"] }, 3, 0] },
            { $cond: [{ $eq: ["$role", target.role] }, 1, 0] },
          ],
        },
      },
    },
    { $match: { score: { $gt: 0 } } },
    { $sort: { score: -1, publishedAt: -1 } },
    { $group: { _id: "$authorId", doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
    { $sort: { score: -1, publishedAt: -1 } },
    { $limit: limit },
    {
      $project: {
        ...CARD_PROJECTION,
        score: 1,
        sharedSkills: 1,
        sharedTopics: 1,
        sameModel: { $eq: ["$model", target.model ?? "__none__"] },
      },
    },
  ]
}

export function moreFromAuthorPipeline(authorId: ObjectId, excludeId: ObjectId, limit = 3): Document[] {
  return [
    {
      $match: {
        authorId,
        _id: { $ne: excludeId },
        status: "published",
        authorSuspended: { $ne: true },
        role: { $in: LIVE_ROLES },
      },
    },
    { $sort: { publishedAt: -1 } },
    { $limit: limit },
    { $project: CARD_PROJECTION },
  ]
}
