import { linksFor } from "../../data/platforms"
import type { Account, WorkDraft, WorkMode } from "../../data/account"
import { defaultTemplateId, fieldsForTemplate } from "../../data/workTemplates"
import type { Person } from "../../data/people"
import type { Work, WorkLink } from "../../data/work"
import type { RoleId, CategoryId } from "../../data/taxonomy"
import type { BusinessModelId } from "../../data/businessModels"

// Backend publicUser() + people listing response shape
export interface ApiUser {
  id?: string
  slug: string
  name: string
  email: string | null
  emailVerifiedAt: string | null
  role: string
  /** Present only on ownerUser responses (GET /auth/me, login, register). */
  access?: "member" | "moderator" | "admin"
  title: string
  company: string
  location: string
  years: number
  languages: string[]
  topics: string[]
  skills: string[]
  openToWork: boolean
  photoUrl: string
  portfolioUrl: string
  pitch: string
  counts: { publishedWorks: number; topicUsage: Record<string, number> }
  createdAt: string
}

// Backend work response shape for mine/list and mine/:id
export interface ApiWorkMine {
  _id: string
  slug: string
  mode: string
  template: string | null
  role: string
  topics: string[]
  model: string | null
  skills: string[]
  title: string
  summary: string
  year: number
  duration: string
  scope: string
  problem: string
  approach: string
  outcome: string
  sections: { heading: string; body: string }[]
  details: { label: string; value: string; proof: boolean }[]
  links: { label: string; href: string }[]
  stack: string[]
  thumbnailPath: string | null
  status: "draft" | "published"
  publishedAt: string | null
  updatedAt: string | null
  createdAt: string
}

// Backend work response shape
export interface ApiWork {
  slug: string
  author: { slug: string }
  mode: string
  role: string
  template?: string
  topics: string[]
  model: string | null
  skills: string[]
  title: string
  summary: string
  year: number
  duration: string
  scope: string
  problem: string
  approach: string
  outcome: string
  sections: { heading: string; body: string }[]
  details: { label: string; value: string; proof: boolean }[]
  links: { label: string; href: string }[]
  stack: string[]
}

export function mapAccount(u: ApiUser): Account {
  return {
    id:           u.slug,
    name:         u.name,
    email:        u.email ?? "",
    location:     u.location,
    role:         u.role as RoleId,
    title:        u.title,
    years:        String(u.years),
    topics:       u.topics as CategoryId[],
    portfolio:    u.portfolioUrl,
    pitch:        u.pitch,
    photo:        u.photoUrl,
    passwordHash:    "",
    emailVerifiedAt: u.emailVerifiedAt,
    access:          u.access ?? "member",
    createdAt:       u.createdAt,
  }
}

export function mapPerson(u: ApiUser): Person {
  return {
    id:         u.slug,
    name:       u.name,
    title:      u.title,
    company:    u.company,
    role:       u.role as RoleId,
    categories: u.topics as CategoryId[],
    location:   u.location,
    skills:     u.skills,
    years:      u.years,
    open:       u.openToWork,
    photo:      u.photoUrl,
    languages:  u.languages,
    links:      linksFor(u.role as RoleId, u.slug),
    bio:        u.pitch,
  }
}

// Backend card projection shape from /people/:slug/work and /work (browse)
export interface ApiWorkCard {
  slug: string
  title: string
  summary: string
  role: string
  topics: string[]
  model: string | null
  skills: string[]
  year: number
  thumbnailPath: string | null
  author: {
    slug: string
    name: string
    title: string
    company: string
    photoUrl: string
    years: number
    languages: string[]
  }
  publishedAt: string
  metrics: { opens: number }
  details: { label: string; value: string; proof: true }[]
}

export function mapWorkCard(w: ApiWorkCard): Work {
  return {
    id:        w.slug,
    authorId:  w.author.slug,
    role:      w.role as RoleId,
    topics:    w.topics as CategoryId[],
    model:     (w.model ?? undefined) as BusinessModelId | undefined,
    title:     w.title,
    summary:   w.summary,
    year:      w.year,
    duration:  "",
    scope:     "",
    problem:   "",
    approach:  "",
    outcome:   "",
    stack:     [],
    skills:    w.skills,
    links:     [],
    details:   w.details,
    sections:  undefined,
    thumbnail: w.thumbnailPath ?? undefined,
    figures:   undefined,
  }
}

export function mapWork(w: ApiWork): Work {
  return {
    id:        w.slug,
    authorId:  w.author.slug,
    role:      w.role as RoleId,
    template:  w.template,
    topics:    w.topics as CategoryId[],
    model:     (w.model ?? undefined) as BusinessModelId | undefined,
    title:     w.title,
    summary:   w.summary,
    year:      w.year,
    duration:  w.duration,
    scope:     w.scope,
    problem:   w.problem,
    approach:  w.approach,
    outcome:   w.outcome,
    stack:     w.stack,
    skills:    w.skills,
    links:     w.links,
    details:   w.details,
    sections:  w.sections.length > 0 ? w.sections : undefined,
    thumbnail: undefined,
    figures:   undefined,
  }
}

function splitTags(value: string): string[] {
  return value.split(",").map((p) => p.trim()).filter(Boolean)
}

function labelForUrl(href: string, fallback: string): string {
  try {
    const { hostname } = new URL(href.startsWith("http") ? href : `https://${href}`)
    return hostname.replace(/^www\./, "")
  } catch {
    return fallback
  }
}

/** Convert a backend mine entry into the local WorkDraft shape. */
export function mapApiWorkMineToDraft(w: ApiWorkMine): WorkDraft {
  const role     = w.role as RoleId
  const mode     = w.mode as WorkMode
  const template = w.template ?? defaultTemplateId(role)

  const values: Record<string, string> = {
    title:    w.title,
    summary:  w.summary,
    year:     String(w.year),
    duration: w.duration,
    scope:    w.scope,
    problem:  w.problem,
    approach: w.approach,
    outcome:  w.outcome,
    model:    w.model ?? "",
  }

  if (mode === "template") {
    const skillSet  = new Set(w.skills)
    const stackOnly = w.stack.filter((s) => !skillSet.has(s))

    for (const field of fieldsForTemplate(role, template)) {
      if (field.kind === "url") continue
      if (field.kind === "tags") {
        values[field.name] = stackOnly.join(", ")
        continue
      }
      const detail = w.details.find((d) => d.label === field.label)
      if (detail) values[field.name] = detail.value
    }
  }

  const metrics =
    mode === "custom" && w.details.length > 0
      ? w.details.map((d) => ({ label: d.label, value: d.value }))
      : [{ label: "", value: "" }]

  return {
    id:        w._id,
    role,
    template,
    mode,
    topics:    w.topics as CategoryId[],
    skills:    w.skills,
    values,
    links:     w.links,
    sections:
      w.sections.length > 0
        ? w.sections
        : mode === "custom"
          ? [
              { heading: "Context",    body: "" },
              { heading: "What I did", body: "" },
              { heading: "Result",     body: "" },
            ]
          : [],
    metrics,
    thumbnail: w.thumbnailPath ?? undefined,
    figures:   [],
    updatedAt: w.updatedAt ?? w.createdAt,
    published: w.status === "published",
  }
}

/** Convert a local WorkDraft into the body for POST /work or PUT /work/:id. */
export function draftToApiBody(draft: WorkDraft) {
  const val = (name: string) => (draft.values[name] ?? "").trim()

  const details: { label: string; value: string; proof: boolean }[] = []
  const links: WorkLink[] = draft.links
    .filter((l) => l.href.trim())
    .map((l) => ({ href: l.href.trim(), label: l.label.trim() || labelForUrl(l.href, "Link") }))
  const stack: string[] = []

  if (draft.mode === "template") {
    for (const field of fieldsForTemplate(draft.role, draft.template)) {
      const raw = val(field.name)
      if (!raw) continue
      if (field.kind === "url")  { links.push({ label: labelForUrl(raw, field.label), href: raw }); continue }
      if (field.kind === "tags") { stack.push(...splitTags(raw)); continue }
      details.push({ label: field.label, value: raw, proof: field.proof ?? false })
    }
  } else {
    for (const metric of draft.metrics) {
      if (!metric.label.trim() || !metric.value.trim()) continue
      details.push({ label: metric.label.trim(), value: metric.value.trim(), proof: true })
    }
  }

  return {
    mode:     draft.mode,
    role:     draft.role,
    template: draft.template,
    topics:   draft.topics.slice(0, 4),
    model:    val("model") || null,
    skills:   draft.skills,
    title:    val("title") || "Untitled",
    summary:  val("summary"),
    year:     Number(val("year")) || new Date().getFullYear(),
    duration: val("duration"),
    scope:    val("scope"),
    problem:  draft.mode === "template" ? val("problem") : "",
    approach: draft.mode === "template" ? val("approach") : "",
    outcome:  draft.mode === "template" ? val("outcome") : "",
    sections: draft.mode === "custom"
      ? draft.sections.filter((s) => s.heading.trim() && s.body.trim())
      : [],
    details,
    links,
    stack: [...new Set([...stack, ...draft.skills])],
  }
}
