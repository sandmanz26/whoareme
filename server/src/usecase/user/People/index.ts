import { z } from "zod"
import User from "../../../models/user.js"
import TrafficEvent from "../../../models/trafficEvent.js"
import TrafficDaily from "../../../models/trafficDaily.js"
import { LIVE_ROLES, ROLES, TOPICS, EXPERIENCE_BAND_IDS } from "../../../constant/app.js"
import { skipFor, pageMeta } from "../../../utils/pagination.js"
import { escapeRegex } from "../../../utils/text.js"
import { experienceCondition, languageCondition } from "../../../utils/facets.js"
import { viewerHash } from "../../../utils/hash.js"
import { notFound } from "../../../middleware/error.js"

const csv = z.string().optional().transform((v) =>
  v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [],
)

export const listPeopleQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(24),
  role:       z.enum(ROLES).optional(),
  topic:      z.enum(TOPICS).optional(),
  skills:     csv.pipe(z.array(z.string().max(60)).max(8)),
  experience: csv.pipe(z.array(z.string()).transform((vals) => vals.filter((v) => EXPERIENCE_BAND_IDS.includes(v as never)))),
  language:   csv.pipe(z.array(z.string().max(40)).max(12)),
  q:          z.string().trim().max(120).optional(),
})

const CARD_PROJECTION = {
  slug: 1, name: 1, title: 1, company: 1, location: 1, role: 1,
  topics: 1, skills: 1, years: 1, languages: 1, openToWork: 1, photoUrl: 1,
  publishedWorks: "$counts.publishedWorks",
}

// Explicit allowlist — any new schema field is excluded by default.
const PUBLIC_PROFILE_PROJECTION = {
  slug: 1, name: 1, title: 1, company: 1, location: 1, role: 1,
  topics: 1, skills: 1, years: 1, languages: 1, openToWork: 1,
  photoUrl: 1, portfolioUrl: 1, pitch: 1,
  "counts.publishedWorks": 1,
  createdAt: 1,
}

const PUBLIC_PERSON = { status: "active" as const, role: { $in: LIVE_ROLES }, deletedAt: null }

function isoDay(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export const PeopleUsecase = {
  async GetList(rawQuery: Record<string, unknown>) {
    const q = listPeopleQuerySchema.parse(rawQuery)
    const tokens = q.q ? q.q.trim().split(/\s+/).filter(Boolean) : []
    const pagination = { page: q.page, limit: q.limit }

    const match: Record<string, unknown> = { ...PUBLIC_PERSON }
    const and: Record<string, unknown>[] = []

    if (q.role)              and.push({ role: q.role })
    if (q.topic)             match["topics"] = q.topic
    if (q.skills.length > 0) match["skills"] = { $all: q.skills }

    const experience = experienceCondition(q.experience, "years")
    if (experience) and.push(experience)
    const language = languageCondition(q.language, "languages")
    if (language) and.push(language)

    for (const token of tokens) and.push({ searchBlob: { $regex: escapeRegex(token), $options: "i" } })
    if (and.length > 0) match["$and"] = and

    const [result] = await User.aggregate([
      { $match: match },
      {
        $facet: {
          items: [
            { $sort: { "counts.publishedWorks": -1, _id: 1 } },
            { $skip: skipFor(pagination) },
            { $limit: q.limit },
            { $project: CARD_PROJECTION },
          ],
          total: [{ $count: "value" }],
        },
      },
    ])

    return {
      items: result?.items ?? [],
      meta:  pageMeta(result?.total?.[0]?.value ?? 0, pagination),
    }
  },

  async GetFacets() {
    const [result] = await User.aggregate([
      { $match: PUBLIC_PERSON },
      {
        $facet: {
          byRole:     [{ $group: { _id: "$role", n: { $sum: 1 } } }],
          byTopic:    [{ $unwind: "$topics" }, { $group: { _id: "$topics", n: { $sum: 1 } } }],
          byLanguage: [{ $unwind: "$languages" }, { $group: { _id: "$languages", n: { $sum: 1 } } }],
          total:      [{ $count: "value" }],
        },
      },
    ])

    const toMap = (rows: Array<{ _id: string; n: number }> = []) =>
      Object.fromEntries(rows.map((r) => [r._id, r.n]))

    return {
      roles:     toMap(result?.byRole),
      topics:    toMap(result?.byTopic),
      languages: toMap(result?.byLanguage),
      total:     result?.total?.[0]?.value ?? 0,
    }
  },

  async GetBySlug(slug: string) {
    const user = await User.findOne(
      { slug, status: "active" as const, role: { $in: LIVE_ROLES }, deletedAt: null },
      PUBLIC_PROFILE_PROJECTION,
    ).lean()
    if (!user) throw notFound("Person")
    return user
  },

  async RecordProfileView(ownerId: string, ip: string, userAgent: string, viewerId?: string) {
    if (viewerId === ownerId) return

    const day = isoDay()
    const hash = viewerHash(ip, userAgent, day)

    try {
      await TrafficEvent.create({
        ownerId, type: "profile_view", workId: null, day, viewerHash: hash,
      })
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) return
      throw err
    }

    await TrafficDaily.updateOne(
      { ownerId, day },
      { $inc: { profile: 1, total: 0 }, $setOnInsert: { ownerId, day, work: {}, total: 0 } },
      { upsert: true },
    )
  },
}
