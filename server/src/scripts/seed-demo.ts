/**
 * Seed a small, repeatable demo dataset for recording a client walkthrough.
 *
 * It creates: one member with a complete profile and two published entries,
 * a week of traffic, a reader report, and a suspended account with an open
 * appeal. Five accounts in total: the member, the reporter, the suspended
 * person, and two moderators (the actor and a second reviewer, because an
 * appeal cannot be reviewed by whoever took the decision).
 *
 * Safe to run again: it deletes only the demo users' content first, so a retake
 * starts from the same state. Run with: npm run db:seed-demo
 */
import { connectDB, disconnectDB } from "../db/mongo.js"
import User from "../models/user.js"
import Work from "../models/work.js"
import Report from "../models/report.js"
import Notice from "../models/notice.js"
import ModerationAction from "../models/moderationAction.js"
import TrafficDaily from "../models/trafficDaily.js"
import TrafficEvent from "../models/trafficEvent.js"
import { hashPassword } from "../service/password.js"
import { uniqueSlug } from "../utils/slug.js"
import { buildSearchBlob } from "../utils/text.js"
import { languagesFor } from "../utils/languages.js"
import type { AccessLevel, RoleId, TopicId } from "../constant/app.js"

interface DemoUser {
  email: string
  password: string
  name: string
  role: RoleId
  title: string
  company: string
  location: string
  years: number
  topics: TopicId[]
  skills: string[]
  openToWork: boolean
  photoUrl: string
  pitch: string
  portfolioUrl: string
  access: AccessLevel
}

const DEMO_USERS: DemoUser[] = [
  {
    email: "maya@warungku.id",
    password: "demo-maya-12345",
    name: "Maya Prasetyo",
    role: "design",
    title: "Senior Product Designer",
    company: "Warungku",
    location: "Jakarta, ID",
    years: 8,
    topics: ["saas", "accessibility"],
    skills: ["Design systems", "Accessibility", "Usability testing", "Prototyping"],
    openToWork: true,
    photoUrl: "https://randomuser.me/api/portraits/women/44.jpg",
    pitch: "I design checkout and inventory tools for people who run a shop and a family at the same time.",
    portfolioUrl: "https://maya.example.com",
    access: "member",
  },
  {
    email: "dewi@rantai.id",
    password: "demo-dewi-12345",
    name: "Dewi Lestari",
    role: "product",
    title: "Product Manager",
    company: "Rantai",
    location: "Bandung, ID",
    years: 6,
    topics: ["erp", "leadership"],
    skills: ["Product strategy", "Roadmapping"],
    openToWork: false,
    photoUrl: "https://randomuser.me/api/portraits/women/68.jpg",
    pitch: "Supply chain software for teams that still run the warehouse on spreadsheets.",
    portfolioUrl: "",
    access: "member",
  },
  {
    email: "agus@warungku.id",
    password: "demo-agus-12345",
    name: "Agus Pratama",
    role: "engineering",
    title: "Backend Engineer",
    company: "Warungku",
    location: "Jakarta, ID",
    years: 5,
    topics: ["saas"],
    skills: ["Go", "Postgres", "Distributed systems"],
    openToWork: false,
    photoUrl: "https://randomuser.me/api/portraits/men/32.jpg",
    pitch: "Backend engineer on the sync and conflict path for offline-first clients.",
    portfolioUrl: "",
    access: "member",
  },
  {
    email: "rani@whoareyou.directory",
    password: "demo-rani-12345",
    name: "Rani Ardhana",
    role: "product",
    title: "Community Lead",
    company: "whoareyou",
    location: "Jakarta, ID",
    years: 9,
    topics: ["leadership"],
    skills: ["Moderation", "Community"],
    openToWork: false,
    photoUrl: "https://randomuser.me/api/portraits/women/65.jpg",
    pitch: "I keep the directory honest and the moderation queue short.",
    portfolioUrl: "",
    access: "moderator",
  },
  {
    email: "bima@whoareyou.directory",
    password: "demo-bima-12345",
    name: "Bima Saputra",
    role: "product",
    title: "Trust and Safety",
    company: "whoareyou",
    location: "Singapore, SG",
    years: 7,
    topics: ["leadership"],
    skills: ["Trust and safety", "Policy"],
    openToWork: false,
    photoUrl: "https://randomuser.me/api/portraits/men/75.jpg",
    pitch: "Policy and appeals. I review decisions I did not take.",
    portfolioUrl: "",
    access: "moderator",
  },
]

const DEMO_EMAILS = DEMO_USERS.map((u) => u.email)
const DAY = 24 * 60 * 60 * 1000
const isoDay = (date: Date) => date.toISOString().slice(0, 10)

function userSearchBlob(u: DemoUser) {
  return buildSearchBlob([u.name, u.title, u.company, u.location, ...u.skills, ...u.topics])
}

async function upsertUser(def: DemoUser) {
  const passwordHash = await hashPassword(def.password)
  const fields = {
    name: def.name,
    role: def.role,
    title: def.title,
    company: def.company,
    location: def.location,
    years: def.years,
    languages: languagesFor(def.location),
    topics: def.topics,
    skills: def.skills,
    openToWork: def.openToWork,
    photoUrl: def.photoUrl,
    portfolioUrl: def.portfolioUrl,
    pitch: def.pitch,
    emailVerifiedAt: new Date(),
    passwordHash,
    token: null,
    seeded: false,
    status: "active" as const,
    access: def.access,
    deletedAt: null,
    deletedBy: null,
    searchBlob: userSearchBlob(def),
  }

  const existing = await User.findOne({ email: def.email })
  if (existing) {
    await User.updateOne({ _id: existing._id }, { $set: fields })
    const updated = await User.findById(existing._id)
    return updated!
  }

  const slug = await uniqueSlug(def.name, async (candidate) =>
    Boolean(await User.exists({ slug: candidate })),
  )
  return User.create({
    slug,
    email: def.email,
    counts: { publishedWorks: 0, topicUsage: {} },
    ...fields,
  })
}

async function main() {
  await connectDB()
  console.log("Connected to", process.env["MONGODB_DB"] ?? "whoareyou")

  const existing = await User.find({ email: { $in: DEMO_EMAILS } }).select("_id")
  const ids = existing.map((u) => u._id)
  const oldWorks = await Work.find({ authorId: { $in: ids } }).select("_id")
  const oldWorkIds = oldWorks.map((w) => w._id)

  await Promise.all([
    Work.deleteMany({ authorId: { $in: ids } }),
    TrafficEvent.deleteMany({ ownerId: { $in: ids } }),
    TrafficDaily.deleteMany({ ownerId: { $in: ids } }),
    Notice.deleteMany({ userId: { $in: ids } }),
    Report.deleteMany({
      $or: [
        { targetKind: "work", targetId: { $in: oldWorkIds } },
        { note: /^Demo:/ },
        { reporterHash: "demo-reporter-1" },
      ],
    }),
    ModerationAction.deleteMany({ reason: /^Demo:/ }),
  ])

  const users: Awaited<ReturnType<typeof upsertUser>>[] = []
  for (const def of DEMO_USERS) users.push(await upsertUser(def))
  const [mayaDoc, , agusDoc, raniDoc] = users

  const authorSnapshot = {
    slug: mayaDoc!.slug,
    name: mayaDoc!.name,
    title: mayaDoc!.title,
    company: mayaDoc!.company,
    photoUrl: mayaDoc!.photoUrl,
    years: mayaDoc!.years,
    languages: mayaDoc!.languages,
  }

  async function createWork(input: Record<string, unknown>, daysAgo: number) {
    const title = String(input["title"])
    const slug = await uniqueSlug(title, async (candidate) =>
      Boolean(await Work.exists({ slug: candidate })),
    )
    const work = await Work.create({
      slug,
      authorId: mayaDoc!._id,
      author: authorSnapshot,
      authorSuspended: false,
      seeded: false,
      thumbnailPath: null,
      status: "published",
      publishedAt: new Date(Date.now() - daysAgo * DAY),
      metrics: { opens: 0 },
      ...input,
      searchBlob: buildSearchBlob([
        String(input["title"]),
        String(input["summary"]),
        String(input["problem"] ?? ""),
        String(input["approach"] ?? ""),
        String(input["outcome"] ?? ""),
        ...((input["sections"] as Array<{ heading: string; body: string }>) ?? []).flatMap((s) => [
          s.heading,
          s.body,
        ]),
        ...((input["details"] as Array<{ label: string; value: string }>) ?? []).flatMap((d) => [
          d.label,
          d.value,
        ]),
        ...((input["skills"] as string[]) ?? []),
        ...((input["stack"] as string[]) ?? []),
        ...((input["topics"] as string[]) ?? []),
        String(input["model"] ?? ""),
        mayaDoc!.name,
        mayaDoc!.company,
        mayaDoc!.location,
      ]),
    })
    return work
  }

  const workA = await createWork(
    {
      mode: "template",
      template: "design-case",
      role: "design",
      topics: ["saas"],
      model: "b2b-saas",
      skills: ["Design systems", "Usability testing"],
      title: "Rebuilding checkout for 61,000 warung owners",
      summary: "A checkout built for power users was abandoning everyone who runs a shop from a phone.",
      year: 2025,
      duration: "4 months",
      scope: "Led design, partnered with two engineers",
      problem:
        "Warung owners were dropping out of checkout at the payment step. The flow assumed a desktop, a stable connection and a bank account, and most of our users had one of the three.",
      approach:
        "I ran sessions in three markets, rewrote the flow around a single screen, and shipped it behind a flag to 5% of traffic before widening it.",
      outcome:
        "Task success rose from 58% to 91%, and the median time to a first order fell from six minutes to under two.",
      sections: [],
      details: [
        { label: "Task success", value: "58% to 91%", proof: true },
        { label: "Time to first order", value: "6m 40s to 1m 55s", proof: true },
        { label: "Markets", value: "Jakarta, Surabaya, Makassar", proof: false },
      ],
      links: [{ label: "Warungku", href: "https://warungku.id" }],
      stack: ["Figma", "Maze"],
    },
    1,
  )

  const workB = await createWork(
    {
      mode: "custom",
      template: null,
      role: "design",
      topics: ["accessibility", "healthtech"],
      model: "enterprise",
      skills: ["Accessibility", "Design systems"],
      title: "An accessibility audit that shipped",
      summary: "Contrast and keyboard traps, fixed in the product rather than in a PDF.",
      year: 2024,
      duration: "3 months",
      scope: "Solo audit, paired with two squads",
      problem: "",
      approach: "",
      outcome: "",
      sections: [
        {
          heading: "Context",
          body: "A clinic booking product had passed a visual review but failed keyboard use. The audit was commissioned after a support ticket from a screen reader user.",
        },
        {
          heading: "What we changed",
          body: "We fixed contrast tokens at the theme level, removed four focus traps in the booking dialog, and added keyboard tests to the release checklist.",
        },
        {
          heading: "What changed",
          body: "The booking flow became usable end to end with a keyboard, and the fixes held because they lived in tokens rather than one-off styles.",
        },
      ],
      details: [
        { label: "Contrast issues fixed", value: "42", proof: true },
        { label: "Keyboard traps removed", value: "7", proof: true },
      ],
      links: [],
      stack: ["Figma", "Axe"],
    },
    22,
  )

  // A week of traffic so the panel is not an empty chart.
  const profiles = [4, 7, 5, 9, 6, 8, 11]
  const opensA = [2, 3, 1, 4, 2, 3, 4]
  const opensB = [1, 1, 2, 1, 2, 2, 3]
  let totalA = 0
  let totalB = 0
  for (let i = 0; i < 7; i++) {
    const day = isoDay(new Date(Date.now() - (6 - i) * DAY))
    totalA += opensA[i]!
    totalB += opensB[i]!
    await TrafficDaily.updateOne(
      { ownerId: mayaDoc!._id, day },
      {
        $set: {
          profile: profiles[i],
          work: { [workA._id.toString()]: opensA[i], [workB._id.toString()]: opensB[i] },
          total: opensA[i]! + opensB[i]!,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )
  }
  await Work.updateOne({ _id: workA._id }, { $set: { "metrics.opens": totalA } })
  await Work.updateOne({ _id: workB._id }, { $set: { "metrics.opens": totalB } })
  await User.updateOne(
    { _id: mayaDoc!._id },
    {
      $set: {
        "counts.publishedWorks": 2,
        "counts.topicUsage": { saas: 1, accessibility: 1, healthtech: 1 },
      },
    },
  )

  // A reader report on the first entry, so the queue has something to act on.
  await Report.create({
    targetKind: "work",
    targetId: workA._id,
    reason: "false-claim",
    note: "Demo: the headline task-success figure does not match the outcome text.",
    reporterHash: "demo-reporter-1",
    day: isoDay(new Date()),
    resolvedAt: null,
    resolvedBy: null,
  })

  // A suspension with an open appeal, so the reviewer queue has a real decision.
  await User.updateOne({ _id: agusDoc!._id }, { $set: { status: "suspended" } })
  const action = await ModerationAction.create({
    action: "suspend",
    targetKind: "user",
    targetId: agusDoc!._id,
    targetLabel: agusDoc!.name,
    reason: "Demo: repeated late delivery on a client engagement.",
    actorId: raniDoc!._id,
    actorSlug: raniDoc!.slug,
  })
  await Notice.create({
    userId: agusDoc!._id,
    actionId: action._id,
    action: "suspend",
    targetKind: "user",
    targetId: agusDoc!._id,
    targetLabel: agusDoc!.name,
    reason: "Demo: repeated late delivery on a client engagement.",
    actorId: raniDoc!._id,
    readAt: null,
    appeal: {
      text: "Demo: the deadline moved twice after the scope changed; here is the thread.",
      createdAt: new Date(),
      outcome: null,
      outcomeReason: "",
      decidedAt: null,
      decidedBy: null,
    },
  })

  console.log("Demo data ready:")
  for (const u of DEMO_USERS) {
    console.log(`  ${u.access.padEnd(9)} ${u.email}  ${u.password}`)
  }
  console.log(`  entries: /work/${workA.slug} and /work/${workB.slug}`)
  console.log(`  profile: /people/${mayaDoc!.slug}`)

  await disconnectDB()
}

main().catch(async (err) => {
  console.error(err)
  await disconnectDB().catch(() => {})
  process.exit(1)
})
