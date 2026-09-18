import { ObjectId } from "mongodb"
import { connect, disconnect } from "../db/client.js"
import { users, works } from "../db/collections.js"
import { ensureIndexes } from "../db/indexes.js"
import { applyValidators } from "../db/schema.js"
import { buildSearchBlob } from "../lib/text.js"
import { languagesFor } from "../lib/languages.js"
import { logger } from "../lib/logger.js"
import type { RoleId, TopicId, UserDoc, WorkDoc, BusinessModelId } from "../types.js"

// The API never imports from the app's source tree — it must stay
// independently deployable. `npm run export:fixtures` in the repo root
// regenerates these from the front-end fixtures.
import peopleFixture from "../../fixtures/people.json" with { type: "json" }
import worksFixture from "../../fixtures/works.json" with { type: "json" }

const PEOPLE = peopleFixture as SeedPerson[]
const SEED_WORK = worksFixture as SeedWork[]

interface SeedPerson {
  id: string
  name: string
  title: string
  company: string
  role: string
  categories: string[]
  location: string
  skills: string[]
  years: number
  open: boolean
  photo: string
  /** Present in the exported fixtures; derived from the country if not. */
  languages?: string[]
}

interface SeedWork {
  id: string
  authorId: string
  role: string
  model?: string | null
  topics: string[]
  skills: string[]
  title: string
  summary: string
  year: number
  duration: string
  scope: string
  problem: string
  approach: string
  outcome: string
  stack: string[]
  links: Array<{ label: string; href: string }>
  details: Array<{ label: string; value: string; proof?: boolean }>
  sections?: Array<{ heading: string; body: string }>
}

const DRY_RUN = process.argv.includes("--dry")

function userFrom(person: SeedPerson): UserDoc {
  const now = new Date()
  const doc: UserDoc = {
    _id: new ObjectId(),
    slug: person.id,
    name: person.name,
    email: null,
    passwordHash: null,
    emailVerifiedAt: null,
    emailVerifyTokenHash: null,
    emailVerifyExpiresAt: null,
    role: person.role as RoleId,
    title: person.title,
    company: person.company,
    location: person.location,
    years: person.years,
    languages: person.languages ?? languagesFor(person.location),
    topics: person.categories as TopicId[],
    skills: person.skills,
    openToWork: person.open,
    photoUrl: person.photo,
    portfolioUrl: "",
    pitch: "",
    seeded: true,
    status: "active",
    // Everyone registers as a member. Promotion to moderator or admin is a
    // deliberate act, never a side effect of signing up.
    access: "member",
    counts: { publishedWorks: 0, topicUsage: {} },
    searchBlob: "",
    createdAt: now,
    updatedAt: now,
  }
  doc.searchBlob = buildSearchBlob([
    doc.name, doc.title, doc.company, doc.location, ...doc.skills, ...doc.topics,
  ])
  return doc
}

function workFrom(entry: SeedWork, author: UserDoc): WorkDoc {
  const now = new Date()
  // Spread published dates across the year so "most recent" has real order.
  const publishedAt = new Date(entry.year, (entry.id.charCodeAt(0) % 12), 1 + (entry.id.length % 27))

  const doc: WorkDoc = {
    _id: new ObjectId(),
    slug: entry.id,
    authorId: author._id,
    author: {
      slug: author.slug,
      name: author.name,
      title: author.title,
      company: author.company,
      photoUrl: author.photoUrl,
      // The entry grid filters on these, so they travel with the snapshot.
      years: author.years,
      languages: author.languages,
    },
    mode: entry.sections && entry.sections.length > 0 ? "custom" : "template",
    role: entry.role as RoleId,
    topics: entry.topics as TopicId[],
    model: (entry.model ?? null) as BusinessModelId | null,
    skills: entry.skills,
    title: entry.title,
    summary: entry.summary,
    year: entry.year,
    duration: entry.duration,
    scope: entry.scope,
    problem: entry.problem,
    approach: entry.approach,
    outcome: entry.outcome,
    sections: entry.sections ?? [],
    details: entry.details.map((d) => ({ label: d.label, value: d.value, proof: Boolean(d.proof) })),
    links: entry.links,
    stack: entry.stack,
    thumbnailId: null,
    status: "published",
    publishedAt,
    metrics: { opens: 0 },
    searchBlob: "",
    createdAt: publishedAt,
    updatedAt: now,
  }

  doc.searchBlob = buildSearchBlob([
    doc.title, doc.summary, doc.problem, doc.approach, doc.outcome,
    ...doc.sections.flatMap((s) => [s.heading, s.body]),
    ...doc.details.flatMap((d) => [d.label, d.value]),
    ...doc.skills, ...doc.stack, ...doc.topics, doc.model ?? "",
    author.name, author.company, author.location,
  ])
  return doc
}

async function main() {
  logger.info({ people: PEOPLE.length, work: SEED_WORK.length, dryRun: DRY_RUN }, "seeding")

  const orphans = SEED_WORK.filter((w) => !PEOPLE.some((p) => p.id === w.authorId))
  if (orphans.length > 0) {
    throw new Error(`Work entries reference unknown authors: ${orphans.map((w) => w.id).join(", ")}`)
  }

  if (DRY_RUN) {
    logger.info("dry run: fixtures parsed cleanly, nothing written")
    return
  }

  await connect()
  await applyValidators()
  await ensureIndexes()

  // Upsert people first, then read back so works can reference real _ids.
  for (const person of PEOPLE) {
    const doc = userFrom(person)
    const { _id, createdAt, counts, ...rest } = doc
    void _id
    await users().updateOne(
      { slug: doc.slug },
      { $set: { ...rest, updatedAt: new Date() }, $setOnInsert: { _id: new ObjectId(), createdAt, counts } },
      { upsert: true },
    )
  }

  const bySlug = new Map(
    (await users().find({ seeded: true }).toArray()).map((user) => [user.slug, user]),
  )

  for (const entry of SEED_WORK) {
    const author = bySlug.get(entry.authorId)
    if (!author) continue
    const doc = workFrom(entry, author)
    const { _id, createdAt, metrics, ...rest } = doc
    void _id
    await works().updateOne(
      { slug: doc.slug },
      {
        $set: { ...rest, updatedAt: new Date() },
        $setOnInsert: { _id: new ObjectId(), createdAt, metrics },
      },
      { upsert: true },
    )
  }

  // Counters are derived, never seeded by hand.
  const counts = await works()
    .aggregate<{ _id: { authorId: ObjectId; topic: TopicId }; n: number }>([
      { $match: { status: "published" } },
      { $unwind: "$topics" },
      { $group: { _id: { authorId: "$authorId", topic: "$topics" }, n: { $sum: 1 } } },
    ])
    .toArray()

  const totals = await works()
    .aggregate<{ _id: ObjectId; n: number }>([
      { $match: { status: "published" } },
      { $group: { _id: "$authorId", n: { $sum: 1 } } },
    ])
    .toArray()

  const rollup = new Map<string, { publishedWorks: number; topicUsage: Record<string, number> }>()
  for (const row of totals) rollup.set(String(row._id), { publishedWorks: row.n, topicUsage: {} })
  for (const row of counts) {
    const key = String(row._id.authorId)
    const entry = rollup.get(key) ?? { publishedWorks: 0, topicUsage: {} }
    entry.topicUsage[row._id.topic] = row.n
    rollup.set(key, entry)
  }
  for (const [id, value] of rollup) {
    await users().updateOne({ _id: new ObjectId(id) }, { $set: { counts: value } })
  }

  logger.info(
    { users: await users().countDocuments(), works: await works().countDocuments() },
    "seed complete",
  )
  await disconnect()
}

main().catch((error) => {
  logger.fatal({ err: error }, "seed failed")
  process.exit(1)
})
