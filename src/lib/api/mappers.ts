import { linksFor } from "../../data/platforms"
import type { Account } from "../../data/account"
import type { Person } from "../../data/people"
import type { Work } from "../../data/work"
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
    passwordHash: "",
    createdAt:    u.createdAt,
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
