import path from "node:path"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import {
  ROLES,
  TOPICS,
  BUSINESS_MODELS,
  LIVE_ROLES,
  TOPIC_QUOTA,
  type RoleId,
  type TopicId,
  type BusinessModelId,
} from "../constant/app.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(__dirname, "../../fixtures")

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
  model?: string
  skills?: string[]
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

async function readJson<T>(name: string): Promise<T> {
  const text = await readFile(path.join(FIXTURES, name), "utf8")
  return JSON.parse(text) as T
}

async function main() {
  const [people, works] = await Promise.all([
    readJson<PersonFixture[]>("people.json"),
    readJson<WorkFixture[]>("works.json"),
  ])

  const errors: string[] = []
  const warnings: string[] = []

  // ── People ─────────────────────────────────────────────────────────────────
  const peopleIds = new Set<string>()
  const peopleIdsNotLive: Array<{ id: string; role: string }> = []
  const REQUIRED_PERSON: (keyof PersonFixture)[] = [
    "id",
    "name",
    "title",
    "company",
    "role",
    "categories",
    "location",
    "skills",
    "years",
  ]

  for (const p of people) {
    for (const field of REQUIRED_PERSON) {
      if (p[field] === undefined || p[field] === null || p[field] === "") {
        errors.push(`PEOPLE[${p.id || "?"}]: missing field '${field}'`)
      }
    }

    if (peopleIds.has(p.id)) errors.push(`PEOPLE: duplicate id '${p.id}'`)
    peopleIds.add(p.id)

    if (!ROLES.includes(p.role as RoleId)) {
      errors.push(`PEOPLE[${p.id}]: invalid role '${p.role}'`)
    } else if (!LIVE_ROLES.includes(p.role as RoleId)) {
      peopleIdsNotLive.push({ id: p.id, role: p.role })
    }

    for (const t of p.categories ?? []) {
      if (!TOPICS.includes(t as TopicId)) {
        errors.push(`PEOPLE[${p.id}]: invalid topic '${t}'`)
      }
    }

    if (typeof p.years !== "number" || p.years < 0 || p.years > 60) {
      errors.push(`PEOPLE[${p.id}]: suspicious years=${p.years}`)
    }
  }

  // ── Works ──────────────────────────────────────────────────────────────────
  const workIds = new Set<string>()
  const quotaCheck = new Map<string, Map<string, number>>()
  const REQUIRED_WORK: (keyof WorkFixture)[] = ["id", "authorId", "role", "title", "year"]

  for (const w of works) {
    for (const field of REQUIRED_WORK) {
      if (w[field] === undefined || w[field] === null || w[field] === "") {
        errors.push(`WORK[${w.id || "?"}]: missing field '${field}'`)
      }
    }

    if (workIds.has(w.id)) errors.push(`WORK: duplicate id '${w.id}'`)
    workIds.add(w.id)

    if (!peopleIds.has(w.authorId)) {
      errors.push(`WORK[${w.id}]: unknown authorId '${w.authorId}'`)
    }

    if (!ROLES.includes(w.role as RoleId)) {
      errors.push(`WORK[${w.id}]: invalid role '${w.role}'`)
    } else if (!LIVE_ROLES.includes(w.role as RoleId)) {
      warnings.push(`WORK[${w.id}]: role '${w.role}' is not LIVE — won't appear in public list`)
    }

    for (const t of w.topics ?? []) {
      if (!TOPICS.includes(t as TopicId)) {
        errors.push(`WORK[${w.id}]: invalid topic '${t}'`)
      }
    }

    if (w.model && !BUSINESS_MODELS.includes(w.model as BusinessModelId)) {
      errors.push(`WORK[${w.id}]: invalid business model '${w.model}'`)
    }

    if (typeof w.year !== "number" || w.year < 2000 || w.year > new Date().getFullYear() + 1) {
      warnings.push(`WORK[${w.id}]: suspicious year=${w.year}`)
    }

    // Quota tracking: per author × per topic
    if (!quotaCheck.has(w.authorId)) quotaCheck.set(w.authorId, new Map())
    const authorTopics = quotaCheck.get(w.authorId)!
    for (const t of w.topics ?? []) {
      authorTopics.set(t, (authorTopics.get(t) ?? 0) + 1)
    }
  }

  // Quota violations (hard invariant from CLAUDE.md)
  for (const [authorId, topics] of quotaCheck) {
    for (const [topic, count] of topics) {
      if (count > TOPIC_QUOTA) {
        errors.push(
          `QUOTA: author '${authorId}' has ${count} works tagged '${topic}' (max ${TOPIC_QUOTA})`,
        )
      }
    }
  }

  // ── People without any work (soft check) ───────────────────────────────────
  const authorsWithWork = new Set(works.map((w) => w.authorId))
  const peopleWithoutWork = [...peopleIds].filter((id) => !authorsWithWork.has(id))

  // ── Report ─────────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("SEED FIXTURES INTEGRITY CHECK")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`People: ${people.length}, Works: ${works.length}`)
  console.log()

  if (errors.length) {
    console.log(`❌ ERRORS (${errors.length}):`)
    for (const e of errors) console.log("  " + e)
    console.log()
  }

  if (warnings.length) {
    console.log(`⚠  WARNINGS (${warnings.length}):`)
    for (const w of warnings) console.log("  " + w)
    console.log()
  }

  if (peopleIdsNotLive.length) {
    console.log(`⚠  People with non-LIVE role (won't appear publicly, ${peopleIdsNotLive.length}):`)
    for (const p of peopleIdsNotLive) console.log(`  ${p.id} (${p.role})`)
    console.log()
  }

  if (peopleWithoutWork.length) {
    console.log(`⚠  People with NO works (${peopleWithoutWork.length}):`)
    for (const id of peopleWithoutWork) console.log("  " + id)
    console.log()
  }

  if (errors.length === 0) {
    console.log("✅ Integrity check passed.")
    process.exit(0)
  } else {
    console.log(`💥 Integrity check FAILED with ${errors.length} error(s).`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})