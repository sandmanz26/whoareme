import { Router } from "express"
import { z } from "zod"
import { users } from "../../db/collections.js"
import { notFound } from "../../lib/errors.js"
import { asyncHandler } from "../../lib/http.js"
import { escapeRegex, tokenize } from "../../lib/text.js"
import { pageMeta, paginationSchema, skipFor } from "../../lib/pagination.js"
import { validate, params, query } from "../../middleware/validate.js"
import { optionalAuth } from "../../middleware/auth.js"
import { ROLES, TOPICS } from "../../types.js"
import { recordProfileView } from "../traffic/service.js"

const csv = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []))

const listQuerySchema = paginationSchema.extend({
  role: z.enum(ROLES).optional(),
  topic: z.enum(TOPICS).optional(),
  skills: csv.pipe(z.array(z.string().max(60)).max(8)),
  q: z.string().trim().max(120).optional(),
})

const slugParamSchema = z.object({ slug: z.string().trim().min(1).max(120) })

const CARD_FIELDS = {
  slug: 1, name: 1, title: 1, company: 1, location: 1, role: 1,
  topics: 1, skills: 1, years: 1, openToWork: 1, photoUrl: 1,
  publishedWorks: "$counts.publishedWorks",
} as const

export const userRouter = Router()

userRouter.get(
  "/",
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    const q = query(req, listQuerySchema)
    const tokens = tokenize(q.q)

    const match: Record<string, unknown> = { status: "active" }
    if (q.role) match.role = q.role
    if (q.topic) match.topics = q.topic
    if (q.skills.length > 0) match.skills = { $all: q.skills }
    if (tokens.length > 0) {
      match.$and = tokens.map((token) => ({ searchBlob: { $regex: escapeRegex(token) } }))
    }

    const [result] = await users()
      .aggregate([
        { $match: match },
        {
          $facet: {
            items: [
              // Most-published first: a directory should lead with evidence.
              { $sort: { "counts.publishedWorks": -1, _id: 1 } },
              { $skip: skipFor(q) },
              { $limit: q.limit },
              { $project: CARD_FIELDS },
            ],
            total: [{ $count: "value" }],
          },
        },
      ])
      .toArray()

    res.json({
      items: result?.items ?? [],
      meta: pageMeta(result?.total?.[0]?.value ?? 0, q),
    })
  }),
)

/** Counts for the craft grid and topic rail. Unfiltered, so it is cacheable. */
userRouter.get(
  "/facets",
  asyncHandler(async (_req, res) => {
    const [result] = await users()
      .aggregate([
        { $match: { status: "active" } },
        {
          $facet: {
            byRole: [{ $group: { _id: "$role", n: { $sum: 1 } } }],
            byTopic: [{ $unwind: "$topics" }, { $group: { _id: "$topics", n: { $sum: 1 } } }],
            total: [{ $count: "value" }],
          },
        },
      ])
      .toArray()

    const toMap = (rows: Array<{ _id: string; n: number }> = []) =>
      Object.fromEntries(rows.map((row) => [row._id, row.n]))

    res.setHeader("Cache-Control", "public, max-age=60")
    res.json({
      roles: toMap(result?.byRole),
      topics: toMap(result?.byTopic),
      total: result?.total?.[0]?.value ?? 0,
    })
  }),
)

userRouter.get(
  "/:slug",
  optionalAuth,
  validate({ params: slugParamSchema }),
  asyncHandler(async (req, res) => {
    const { slug } = params(req, slugParamSchema)
    const user = await users().findOne(
      { slug, status: "active" },
      { projection: { passwordHash: 0, email: 0, searchBlob: 0 } },
    )
    if (!user) throw notFound("Person")

    void recordProfileView(user._id, req).catch(() => {})

    res.json({ user })
  }),
)
