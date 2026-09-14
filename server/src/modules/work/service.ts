import { ObjectId } from "mongodb"
import { getClient, supportsTransactions } from "../../db/client.js"
import { users, works } from "../../db/collections.js"
import { ApiError, QuotaError, conflict, forbidden, notFound } from "../../lib/errors.js"
import { buildSearchBlob, uniqueSlug } from "../../lib/text.js"
import { pageMeta, skipFor, type Pagination } from "../../lib/pagination.js"
import { TOPIC_QUOTA, type UserDoc, type WorkDoc } from "../../types.js"
import { publishableSchema, type WorkInput } from "./schema.js"
import {
  CARD_PROJECTION,
  listWorkPipeline,
  moreFromAuthorPipeline,
  similarWorkPipeline,
  type ListFilters,
} from "./queries.js"

function authorSnapshot(user: UserDoc) {
  return {
    slug: user.slug,
    name: user.name,
    title: user.title,
    company: user.company,
    photoUrl: user.photoUrl,
  }
}

function searchBlobFor(input: WorkInput, author: UserDoc) {
  return buildSearchBlob([
    input.title,
    input.summary,
    input.problem,
    input.approach,
    input.outcome,
    ...input.sections.flatMap((s) => [s.heading, s.body]),
    ...input.details.flatMap((d) => [d.label, d.value]),
    ...input.skills,
    ...input.stack,
    ...input.topics,
    input.model ?? "",
    author.name,
    author.company,
    author.location,
  ])
}

export async function listWork(
  filters: ListFilters,
  sort: string,
  pagination: Pagination,
) {
  const [result] = await works()
    .aggregate(listWorkPipeline(filters, sort, skipFor(pagination), pagination.limit))
    .toArray()

  return {
    items: result?.items ?? [],
    facets: {
      skills: (result?.skills ?? []).map((s: { _id: string; n: number }) => ({ value: s._id, count: s.n })),
      models: (result?.models ?? [])
        .filter((m: { _id: string | null }) => m._id)
        .map((m: { _id: string; n: number }) => ({ value: m._id, count: m.n })),
    },
    meta: pageMeta(result?.total ?? 0, pagination),
  }
}

export async function getPublishedBySlug(slug: string) {
  const work = await works().findOne({ slug, status: "published" })
  if (!work) throw notFound("Case study")
  return work
}

export async function getDetail(slug: string) {
  const work = await getPublishedBySlug(slug)
  const [moreByAuthor, similar] = await Promise.all([
    works().aggregate(moreFromAuthorPipeline(work.authorId, work._id)).toArray(),
    works().aggregate(similarWorkPipeline(work)).toArray(),
  ])
  return { work, moreByAuthor, similar }
}

export async function listMine(userId: ObjectId) {
  return works().find({ authorId: userId }).sort({ updatedAt: -1 }).toArray()
}

export async function getMine(userId: ObjectId, id: ObjectId) {
  const work = await works().findOne({ _id: id })
  if (!work) throw notFound("Entry")
  if (!work.authorId.equals(userId)) throw forbidden("That entry belongs to someone else.")
  return work
}

export async function createDraft(author: UserDoc, input: WorkInput): Promise<WorkDoc> {
  const slug = await uniqueSlug(input.title, async (candidate) =>
    Boolean(await works().findOne({ slug: candidate }, { projection: { _id: 1 } })),
  )

  const now = new Date()
  const doc: WorkDoc = {
    _id: new ObjectId(),
    slug,
    authorId: author._id,
    author: authorSnapshot(author),
    ...input,
    thumbnailId: null,
    status: "draft",
    publishedAt: null,
    metrics: { opens: 0 },
    searchBlob: searchBlobFor(input, author),
    createdAt: now,
    updatedAt: now,
  }

  await works().insertOne(doc)
  return doc
}

export async function updateDraft(author: UserDoc, id: ObjectId, input: WorkInput): Promise<WorkDoc> {
  const existing = await getMine(author._id, id)

  await works().updateOne(
    { _id: existing._id },
    {
      $set: {
        ...input,
        author: authorSnapshot(author),
        searchBlob: searchBlobFor(input, author),
        updatedAt: new Date(),
      },
    },
  )

  return getMine(author._id, id)
}

/**
 * Publish is the only place the two-per-topic quota is enforced, and it has to
 * be atomic: a count-then-write would let two concurrent requests both pass
 * the check. The guarded update below refuses to match if *any* target topic
 * is already at the cap, which makes check-and-increment one operation.
 */
export async function publish(author: UserDoc, id: ObjectId): Promise<WorkDoc> {
  const existing = await getMine(author._id, id)
  if (existing.status === "published") throw conflict("That entry is already published.")

  // Publishing has a higher bar than saving a draft.
  const parsed = publishableSchema.safeParse(existing)
  if (!parsed.success) {
    throw new ApiError(422, "not_publishable", "This entry is not ready to publish.", {
      issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    })
  }

  const topics = existing.topics
  const now = new Date()

  const run = async (session?: import("mongodb").ClientSession) => {
    const guard = await users().updateOne(
      {
        _id: author._id,
        status: "active",
        $nor: topics.map((topic) => ({ [`counts.topicUsage.${topic}`]: { $gte: TOPIC_QUOTA } })),
      },
      {
        $inc: {
          "counts.publishedWorks": 1,
          ...Object.fromEntries(topics.map((topic) => [`counts.topicUsage.${topic}`, 1])),
        },
        $set: { updatedAt: now },
      },
      session ? { session } : {},
    )

    if (guard.matchedCount === 0) {
      const fresh = await users().findOne({ _id: author._id }, { projection: { counts: 1 } })
      const full = topics.filter((t) => (fresh?.counts.topicUsage?.[t] ?? 0) >= TOPIC_QUOTA)
      throw new QuotaError(full.length > 0 ? full : topics, TOPIC_QUOTA)
    }

    const flipped = await works().updateOne(
      { _id: existing._id, authorId: author._id, status: "draft" },
      { $set: { status: "published", publishedAt: now, updatedAt: now } },
      session ? { session } : {},
    )
    if (flipped.matchedCount === 0) throw conflict("That entry is already published.")
  }

  if (await supportsTransactions()) {
    const session = getClient().startSession()
    try {
      await session.withTransaction(() => run(session))
    } finally {
      await session.endSession()
    }
  } else {
    // Standalone mongod: run the same steps and compensate if the second
    // write fails, so the counters cannot drift upward on error.
    try {
      await run()
    } catch (error) {
      if (error instanceof QuotaError) throw error
      await users().updateOne(
        { _id: author._id },
        {
          $inc: {
            "counts.publishedWorks": -1,
            ...Object.fromEntries(topics.map((topic) => [`counts.topicUsage.${topic}`, -1])),
          },
        },
      )
      throw error
    }
  }

  return getMine(author._id, id)
}

export async function unpublish(author: UserDoc, id: ObjectId): Promise<WorkDoc> {
  const existing = await getMine(author._id, id)
  if (existing.status !== "published") return existing

  const topics = existing.topics
  await works().updateOne(
    { _id: existing._id, status: "published" },
    { $set: { status: "draft", publishedAt: null, updatedAt: new Date() } },
  )
  await users().updateOne(
    { _id: author._id },
    {
      $inc: {
        "counts.publishedWorks": -1,
        ...Object.fromEntries(topics.map((topic) => [`counts.topicUsage.${topic}`, -1])),
      },
    },
  )

  return getMine(author._id, id)
}

export async function remove(author: UserDoc, id: ObjectId) {
  const existing = await getMine(author._id, id)
  if (existing.status === "published") await unpublish(author, id)
  await works().deleteOne({ _id: existing._id })
}

export async function listByAuthorSlug(slug: string, pagination: Pagination) {
  const author = await users().findOne({ slug, status: "active" }, { projection: { _id: 1 } })
  if (!author) throw notFound("Person")

  const filter = { authorId: author._id, status: "published" as const }
  const [items, total] = await Promise.all([
    works()
      .aggregate([
        { $match: filter },
        { $sort: { publishedAt: -1 } },
        { $skip: skipFor(pagination) },
        { $limit: pagination.limit },
        { $project: CARD_PROJECTION },
      ])
      .toArray(),
    works().countDocuments(filter),
  ])

  return { items, meta: pageMeta(total, pagination) }
}
