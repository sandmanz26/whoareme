import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Types } from "mongoose"
import mongoose from "mongoose"
import { env } from "../config/index.js"
import User from "../models/user.js"
import Work from "../models/work.js"
import { buildSearchBlob } from "../utils/text.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(__dirname, "../../fixtures")

async function readJson<T>(name: string): Promise<T> {
  const { default: data } = await import(path.join(FIXTURES, name), { with: { type: "json" } })
  return data as T
}

interface PersonFixture {
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
  languages: string[]
  bio: string
}

interface WorkFixture {
  id: string
  template: string
  model: string
  skills: string[]
  authorId: string
  role: string
  topics: string[]
  title: string
  summary?: string
  year: number
  duration?: string
  scope?: string
  problem?: string
  approach?: string
  outcome?: string
  stack?: string[]
  links?: { label: string; href: string }[]
  details?: { label: string; value: string; proof?: boolean }[]
  sections?: { heading: string; body: string }[]
}

function userSearchBlob(u: {
  name: string
  title: string
  company: string
  location: string
  skills: string[]
  topics: string[]
}) {
  return buildSearchBlob([u.name, u.title, u.company, u.location, ...u.skills, ...u.topics])
}

function workSearchBlob(
  w: WorkFixture,
  author: { name: string; company: string; location: string },
) {
  return buildSearchBlob([
    w.title,
    w.summary,
    w.problem,
    w.approach,
    w.outcome,
    ...(w.sections ?? []).flatMap((s) => [s.heading, s.body]),
    ...(w.details ?? []).flatMap((d) => [d.label, d.value]),
    ...w.skills,
    ...(w.stack ?? []),
    ...w.topics,
    w.model,
    author.name,
    author.company,
    author.location,
  ])
}

async function main() {
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB })
  console.log("Connected to", env.MONGODB_DB)

  const people: PersonFixture[] = await readJson("people.json")
  const works: WorkFixture[] = await readJson("works.json")

  const now = new Date()

  // Upsert users
  const slugToId = new Map<string, Types.ObjectId>()
  for (const p of people) {
    const topics = p.categories as string[]
    const blob = userSearchBlob({
      name: p.name,
      title: p.title,
      company: p.company,
      location: p.location,
      skills: p.skills,
      topics,
    })

    const result = await User.findOneAndUpdate(
      { slug: p.id },
      {
        $set: {
          slug: p.id,
          name: p.name,
          title: p.title,
          company: p.company,
          role: p.role,
          topics,
          location: p.location,
          skills: p.skills,
          years: p.years,
          openToWork: p.open,
          photoUrl: p.photo,
          languages: p.languages,
          pitch: p.bio,
          seeded: true,
          status: "active",
          access: "member",
          emailVerifiedAt: now,
          searchBlob: blob,
          updatedAt: now,
        },
        $setOnInsert: {
          email: null,
          passwordHash: null,
          token: null,
          portfolioUrl: "",
          counts: { publishedWorks: 0, topicUsage: {} },
          createdAt: now,
          deletedAt: null,
          createdBy: null,
          updatedBy: null,
          deletedBy: null,
        },
      },
      { upsert: true, new: true },
    ).lean()

    if (result) slugToId.set(p.id, (result as { _id: Types.ObjectId })._id)
  }
  console.log(`Upserted ${people.length} users`)

  // Build a lookup map for author snapshots
  const userMap = new Map<string, PersonFixture>()
  for (const p of people) userMap.set(p.id, p)

  // Upsert works
  let workCount = 0
  for (const w of works) {
    const authorId = slugToId.get(w.authorId)
    if (!authorId) {
      console.warn(`  skipping ${w.id}: unknown authorId ${w.authorId}`)
      continue
    }

    const person = userMap.get(w.authorId)!
    const blob = workSearchBlob(w, {
      name: person.name,
      company: person.company,
      location: person.location,
    })

    await Work.findOneAndUpdate(
      { slug: w.id },
      {
        $set: {
          slug: w.id,
          authorId,
          author: {
            slug: person.id,
            name: person.name,
            title: person.title,
            company: person.company,
            photoUrl: person.photo,
            years: person.years,
            languages: person.languages,
          },
          authorSuspended: false,
          mode: "template",
          role: w.role,
          topics: w.topics,
          model: w.model,
          skills: w.skills,
          title: w.title,
          summary: w.summary ?? "",
          year: w.year,
          duration: w.duration ?? "",
          scope: w.scope ?? "",
          problem: w.problem ?? "",
          approach: w.approach ?? "",
          outcome: w.outcome ?? "",
          sections: w.sections ?? [],
          details: (w.details ?? []).map((d) => ({ ...d, proof: d.proof ?? false })),
          links: w.links ?? [],
          stack: w.stack ?? [],
          thumbnailPath: null,
          status: "published" as const,
          publishedAt: now,
          metrics: { opens: 0 },
          searchBlob: blob,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
          deletedAt: null,
          createdBy: null,
          updatedBy: null,
          deletedBy: null,
        },
      },
      { upsert: true },
    )
    workCount++
  }
  console.log(`Upserted ${workCount} works`)

  // Derive counts from published works
  const pipeline = [
    { $match: { status: "published" as const, deletedAt: null } },
    {
      $group: {
        _id: "$authorId",
        publishedWorks: { $sum: 1 },
        topics: { $push: "$topics" },
      },
    },
  ]

  const rows = await Work.aggregate(pipeline)
  for (const row of rows) {
    const topicUsage: Record<string, number> = {}
    for (const arr of row.topics as string[][]) {
      for (const t of arr) topicUsage[t] = (topicUsage[t] ?? 0) + 1
    }

    await User.updateOne(
      { _id: row._id },
      {
        $set: {
          "counts.publishedWorks": row.publishedWorks,
          "counts.topicUsage": topicUsage,
          updatedAt: now,
        },
      },
    )
  }
  console.log(`Reconciled counts for ${rows.length} users`)

  await mongoose.disconnect()
  console.log("Done")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
