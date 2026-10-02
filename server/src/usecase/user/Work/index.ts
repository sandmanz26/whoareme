import { z } from "zod"
import { Types } from "mongoose"
import WorkModel from "../../../models/work.js"
import User from "../../../models/user.js"
import { ROLES, TOPICS, BUSINESS_MODELS, LIVE_ROLES, TOPIC_QUOTA, EXPERIENCE_BAND_IDS, isRoleLive } from "../../../constant/app.js"
import { parsePagination, skipFor, pageMeta } from "../../../utils/pagination.js"
import { escapeRegex, buildSearchBlob } from "../../../utils/text.js"
import { uniqueSlug } from "../../../utils/slug.js"
import { experienceCondition, languageCondition } from "../../../utils/facets.js"
import { conflict, forbidden, notFound, ApiError, QuotaError } from "../../../middleware/error.js"
import type { IUser as _IUser } from "../../../interface/IUser.js"


type AuthorLike = Pick<_IUser, "slug" | "name" | "title" | "company" | "photoUrl" | "years" | "languages" | "location" | "emailVerifiedAt">

const csv = z.string().optional().transform((v) =>
  v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [],
)

export const listWorkQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(5000).default(24),
  role:       z.enum(ROLES).optional(),
  topic:      z.enum(TOPICS).optional(),
  model:      z.enum(BUSINESS_MODELS).optional(),
  skills:     csv.pipe(z.array(z.string().max(60)).max(8)),
  experience: csv.pipe(z.array(z.string()).transform((v) => v.filter((x) => EXPERIENCE_BAND_IDS.includes(x as never)))),
  language:   csv.pipe(z.array(z.string().max(40)).max(12)),
  q:          z.string().trim().max(120).optional(),
  sort:       z.enum(["recent", "title", "role", "popular"]).default("recent"),
})

const linkSchema    = z.object({ label: z.string().trim().max(60).default(""), href: z.string().trim().url().max(500) })
const detailSchema  = z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(200), proof: z.boolean().default(false) })
const sectionSchema = z.object({ heading: z.string().trim().min(1).max(80), body: z.string().trim().min(1).max(2000) })

export const workInputSchema = z.object({
  mode:     z.enum(["template", "custom"]),
  role:     z.enum(ROLES).refine(isRoleLive, { message: "That craft is not open yet." }),
  topics:   z.array(z.enum(TOPICS)).max(4).default([]),
  model:    z.enum(BUSINESS_MODELS).nullable().default(null),
  skills:   z.array(z.string().trim().min(1).max(60)).max(8).default([]),
  title:    z.string().trim().min(1).max(90),
  summary:  z.string().trim().max(140).default(""),
  year:     z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  duration: z.string().trim().max(60).default(""),
  scope:    z.string().trim().max(160).default(""),
  problem:  z.string().trim().max(500).default(""),
  approach: z.string().trim().max(500).default(""),
  outcome:  z.string().trim().max(500).default(""),
  sections: z.array(sectionSchema).max(10).default([]),
  details:  z.array(detailSchema).max(12).default([]),
  links:    z.array(linkSchema).max(8).default([]),
  stack:    z.array(z.string().trim().min(1).max(60)).max(20).default([]),
})

export type WorkInput = z.infer<typeof workInputSchema>

const publishableSchema = workInputSchema.superRefine((v, ctx) => {
  const need = (ok: boolean, path: string, msg: string) => {
    if (!ok) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: msg })
  }
  need(v.topics.length > 0, "topics", "Pick at least one topic so people can find it.")
  need(v.skills.length > 0, "skills", "Add at least one skill — the filters use these.")
  need(Boolean(v.model), "model", "Business model is required.")
  need(v.summary.trim().length > 0, "summary", "A one-line summary is required.")
  if (v.mode === "template") {
    need(v.problem.trim().length > 0,  "problem",  "Describe the problem.")
    need(v.approach.trim().length > 0, "approach", "Describe what you did.")
    need(v.outcome.trim().length > 0,  "outcome",  "Describe what changed.")
  } else {
    need(v.sections.length > 0, "sections", "Write at least one section.")
    need(v.details.some((d) => d.proof), "details", "Add at least one result.")
  }
})

const CARD_PROJECTION = {
  slug: 1, title: 1, summary: 1, role: 1, topics: 1, model: 1,
  skills: 1, year: 1, thumbnailPath: 1, author: 1, publishedAt: 1,
  "metrics.opens": 1,
  details: { $filter: { input: "$details", as: "d", cond: { $eq: ["$$d.proof", true] } } },
}

// Allowlist for the full public work detail — excludes internal/operational fields.
const PUBLIC_WORK_DETAIL_PROJECTION = {
  _id: 1, slug: 1, title: 1, summary: 1, role: 1, template: 1, topics: 1, model: 1,
  skills: 1, year: 1, duration: 1, scope: 1, problem: 1, approach: 1, outcome: 1,
  sections: 1, details: 1, links: 1, stack: 1,
  thumbnailPath: 1, author: 1, publishedAt: 1, updatedAt: 1, createdAt: 1,
  "metrics.opens": 1,
  authorId: 1, // retained for RecordOpen in the controller; not a secret
}

// Fields stripped from mine (owner) responses before serialization.
const MINE_STRIP_FIELDS = new Set(["searchBlob", "authorSuspended", "deletedAt", "deletedBy", "updatedBy", "createdBy", "__v"])

function toMineDoc(doc: Awaited<ReturnType<typeof getMineOrThrow>>) {
  const obj = doc.toObject({ versionKey: false }) as Record<string, unknown>
  for (const key of MINE_STRIP_FIELDS) delete obj[key]
  return obj
}

const SORTS: Record<string, Record<string, 1 | -1>> = {
  recent:  { publishedAt: -1, _id: -1 },
  title:   { title: 1, _id: 1 },
  role:    { role: 1, publishedAt: -1 },
  popular: { "metrics.opens": -1, _id: -1 },
}

const PUBLIC_WORK = { status: "published" as const, authorSuspended: { $ne: true }, role: { $in: LIVE_ROLES }, deletedAt: null }

function authorSnapshot(user: AuthorLike) {
  return {
    slug:      user.slug,
    name:      user.name,
    title:     user.title,
    company:   user.company,
    photoUrl:  user.photoUrl,
    years:     user.years,
    languages: user.languages ?? [],
  }
}

function workSearchBlob(input: WorkInput, author: AuthorLike) {
  return buildSearchBlob([
    input.title, input.summary, input.problem, input.approach, input.outcome,
    ...input.sections.flatMap((s) => [s.heading, s.body]),
    ...input.details.flatMap((d) => [d.label, d.value]),
    ...input.skills, ...input.stack, ...input.topics,
    input.model ?? "",
    author.name, author.company, author.location,
  ])
}

async function getMineOrThrow(userId: string, workId: string) {
  const work = await WorkModel.findOne({ _id: workId, deletedAt: null })
  if (!work) throw notFound("Entry")
  if (work.authorId.toString() !== userId) throw forbidden("That entry belongs to someone else.")
  return work
}

export const WorkUsecase = {
  async GetList(rawQuery: Record<string, unknown>) {
    const q = listWorkQuerySchema.parse(rawQuery)
    const tokens = q.q ? q.q.trim().split(/\s+/).filter(Boolean) : []
    const pagination = { page: q.page, limit: q.limit }

    const match: Record<string, unknown> = { ...PUBLIC_WORK }
    const and: Record<string, unknown>[] = []

    if (q.role)              and.push({ role: q.role })
    if (q.topic)             match["topics"] = q.topic
    if (q.model)             match["model"] = q.model
    if (q.skills.length > 0) match["skills"] = { $all: q.skills }

    const exp = experienceCondition(q.experience, "author.years")
    if (exp) and.push(exp)
    const lang = languageCondition(q.language, "author.languages")
    if (lang) and.push(lang)

    for (const token of tokens) and.push({ searchBlob: { $regex: escapeRegex(token), $options: "i" } })
    if (and.length > 0) match["$and"] = and

    const sort = SORTS[q.sort] ?? SORTS["recent"]!

    const [result] = await WorkModel.aggregate([
      { $match: match },
      {
        $facet: {
          items: [{ $sort: sort }, { $skip: skipFor(pagination) }, { $limit: q.limit }, { $project: CARD_PROJECTION }],
          total: [{ $count: "value" }],
          skills:    [{ $unwind: "$skills" }, { $group: { _id: "$skills", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 14 }],
          models:    [{ $group: { _id: "$model", n: { $sum: 1 } } }, { $sort: { n: -1 } }],
          languages: [{ $unwind: "$author.languages" }, { $group: { _id: "$author.languages", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }],
          experience: [{ $bucket: { groupBy: { $ifNull: ["$author.years", 0] }, boundaries: [0, 5, 10, 15, Number.MAX_SAFE_INTEGER], default: "unknown", output: { n: { $sum: 1 } } } }],
        },
      },
      { $addFields: { total: { $ifNull: [{ $first: "$total.value" }, 0] } } },
    ])

    return {
      items: result?.items ?? [],
      facets: {
        skills:    (result?.skills ?? []).map((s: { _id: string; n: number }) => ({ value: s._id, count: s.n })),
        models:    (result?.models ?? []).filter((m: { _id: string | null }) => m._id).map((m: { _id: string; n: number }) => ({ value: m._id, count: m.n })),
        languages: (result?.languages ?? []).map((l: { _id: string; n: number }) => ({ value: l._id, count: l.n })),
        experience:(result?.experience ?? []).filter((b: { _id: number | string }) => typeof b._id === "number").map((b: { _id: number; n: number }) => ({ value: String(b._id), count: b.n })),
      },
      meta: pageMeta(result?.total ?? 0, pagination),
    }
  },

  async GetBySlug(slug: string) {
    const work = await WorkModel.findOne({ slug, ...PUBLIC_WORK }, PUBLIC_WORK_DETAIL_PROJECTION).lean()
    if (!work) throw notFound("Case study")

    const [moreByAuthor, similar] = await Promise.all([
      WorkModel.aggregate([
        { $match: { authorId: work.authorId, _id: { $ne: work._id }, ...PUBLIC_WORK } },
        { $sort: { publishedAt: -1 } }, { $limit: 3 }, { $project: CARD_PROJECTION },
      ]),
      WorkModel.aggregate([
        {
          $match: {
            ...PUBLIC_WORK,
            _id: { $ne: work._id },
            authorId: { $ne: work.authorId },
            $or: [{ skills: { $in: work.skills } }, { topics: { $in: work.topics } }],
          },
        },
        { $addFields: { sharedSkills: { $setIntersection: ["$skills", work.skills] }, sharedTopics: { $setIntersection: ["$topics", work.topics] } } },
        { $addFields: { score: { $add: [{ $multiply: [{ $min: [{ $size: "$sharedSkills" }, 3] }, 2] }, { $multiply: [{ $size: "$sharedTopics" }, 3] }] } } },
        { $match: { score: { $gt: 0 } } },
        { $sort: { score: -1, publishedAt: -1 } },
        { $group: { _id: "$authorId", doc: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$doc" } },
        { $limit: 3 }, { $project: CARD_PROJECTION },
      ]),
    ])

    return { work, moreByAuthor, similar }
  },

  async GetMineList(userId: string) {
    return WorkModel.find({ authorId: userId, deletedAt: null })
      .select("-searchBlob -authorSuspended -deletedBy -updatedBy -createdBy")
      .sort({ updatedAt: -1 }).lean()
  },

  async GetMineById(userId: string, workId: string) {
    return toMineDoc(await getMineOrThrow(userId, workId))
  },

  async Add(userId: string, input: WorkInput) {
    const author = await User.findOne({ _id: userId, status: "active" }).lean()
    if (!author) throw notFound("Account")

    const slug = await uniqueSlug(input.title, async (candidate) =>
      Boolean(await WorkModel.exists({ slug: candidate })),
    )

    const created = await WorkModel.create({
      slug,
      authorId: userId,
      author:   authorSnapshot(author as unknown as AuthorLike),
      ...input,
      thumbnailPath: null,
      status:        "draft",
      publishedAt:   null,
      metrics:       { opens: 0 },
      searchBlob:    workSearchBlob(input, author as unknown as AuthorLike),
    })
    return toMineDoc(created)
  },

  async Update(userId: string, workId: string, input: WorkInput) {
    const author = await User.findOne({ _id: userId, status: "active" }).lean()
    if (!author) throw notFound("Account")
    await getMineOrThrow(userId, workId)

    await WorkModel.updateOne(
      { _id: workId },
      { $set: { ...input, author: authorSnapshot(author as unknown as AuthorLike), searchBlob: workSearchBlob(input, author as unknown as AuthorLike), updatedAt: new Date() } },
    )
    return toMineDoc(await getMineOrThrow(userId, workId))
  },

  async Publish(userId: string, workId: string) {
    const work   = await getMineOrThrow(userId, workId)
    const author = await User.findOne({ _id: userId, status: "active" }).lean()
    if (!author) throw notFound("Account")

    if (work.status === "published") throw conflict("That entry is already published.")

    if (!author.emailVerifiedAt) {
      throw new ApiError(403, "email_unverified", "Confirm your email address before publishing. Drafts are unaffected.")
    }

    const parsed = publishableSchema.safeParse(work.toObject())
    if (!parsed.success) {
      throw new ApiError(422, "not_publishable", "This entry is not ready to publish.", {
        issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      })
    }

    const topics = work.topics as string[]
    const now = new Date()

    const guard = await User.updateOne(
      {
        _id: userId,
        status: "active",
        $nor: topics.map((t) => ({ [`counts.topicUsage.${t}`]: { $gte: TOPIC_QUOTA } })),
      },
      {
        $inc: { "counts.publishedWorks": 1, ...Object.fromEntries(topics.map((t) => [`counts.topicUsage.${t}`, 1])) },
        $set: { updatedAt: now },
      },
    )

    if (guard.matchedCount === 0) {
      const fresh = await User.findOne({ _id: userId }, "counts").lean()
      const counts = (fresh?.counts as unknown as { topicUsage?: Record<string, number> } | undefined)
      const full = topics.filter((t) => (counts?.topicUsage?.[t] ?? 0) >= TOPIC_QUOTA)
      throw new QuotaError(full.length > 0 ? full : topics)
    }

    try {
      await WorkModel.updateOne(
        { _id: workId, authorId: userId, status: "draft" as const },
        { $set: { status: "published" as const, publishedAt: now, updatedAt: now } },
      )
    } catch (err) {
      await User.updateOne(
        { _id: userId },
        { $inc: { "counts.publishedWorks": -1, ...Object.fromEntries(topics.map((t) => [`counts.topicUsage.${t}`, -1])) } },
      )
      throw err
    }

    return toMineDoc(await getMineOrThrow(userId, workId))
  },

  async Unpublish(userId: string, workId: string) {
    const work = await getMineOrThrow(userId, workId)
    if (work.status !== "published") return toMineDoc(work)

    const topics = work.topics as string[]
    await WorkModel.updateOne({ _id: workId }, { $set: { status: "draft" as const, publishedAt: null, updatedAt: new Date() } })
    await User.updateOne(
      { _id: userId },
      { $inc: { "counts.publishedWorks": -1, ...Object.fromEntries(topics.map((t) => [`counts.topicUsage.${t}`, -1])) } },
    )

    return toMineDoc(await getMineOrThrow(userId, workId))
  },

  async Delete(userId: string, workId: string) {
    const work = await getMineOrThrow(userId, workId)
    if (work.status === "published") await WorkUsecase.Unpublish(userId, workId)
    await WorkModel.updateOne({ _id: workId }, { $set: { deletedAt: new Date(), deletedBy: new Types.ObjectId(userId) } })
  },

  async GetByAuthorSlug(slug: string, rawQuery: Record<string, unknown>) {
    const pagination = parsePagination(rawQuery)
    const author = await User.findOne({ slug, status: "active", role: { $in: LIVE_ROLES } }, "_id").lean()
    if (!author) throw notFound("Person")

    const filter = {
      authorId: (author as { _id: Types.ObjectId })._id,
      status: "published" as const,
      authorSuspended: { $ne: true },
      role: { $in: LIVE_ROLES },
      deletedAt: null,
    }
    const [items, total] = await Promise.all([
      WorkModel.aggregate([
        { $match: filter },
        { $sort: { publishedAt: -1 } },
        { $skip: skipFor(pagination) },
        { $limit: pagination.limit },
        { $project: CARD_PROJECTION },
      ]),
      WorkModel.countDocuments(filter),
    ])

    return { items, meta: pageMeta(total, pagination) }
  },

  async RecordOpen(work: { _id: Types.ObjectId; authorId: Types.ObjectId }, ip: string, userAgent: string, viewerId?: string) {
    if (viewerId && work.authorId.toString() === viewerId) return

    const { default: TrafficEvent } = await import("../../../models/trafficEvent.js")
    const { default: TrafficDaily } = await import("../../../models/trafficDaily.js")

    const day = new Date().toISOString().slice(0, 10)
    const { viewerHash } = await import("../../../utils/hash.js")
    const hash = viewerHash(ip, userAgent, day)

    try {
      await TrafficEvent.create({ ownerId: work.authorId, type: "work_open", workId: work._id, day, viewerHash: hash })
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) return
      throw err
    }

    await Promise.all([
      TrafficDaily.updateOne(
        { ownerId: work.authorId, day },
        { $inc: { total: 1, [`work.${work._id.toString()}`]: 1 }, $setOnInsert: { ownerId: work.authorId, day, profile: 0 } },
        { upsert: true },
      ),
      WorkModel.updateOne({ _id: work._id }, { $inc: { "metrics.opens": 1 } }),
    ])
  },
}
