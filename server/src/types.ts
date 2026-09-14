import type { ObjectId } from "mongodb"

export const ROLES = [
  "design", "engineering", "product", "data", "infra", "quality", "growth", "research",
] as const
export type RoleId = (typeof ROLES)[number]

export const TOPICS = [
  "saas", "ai", "leadership", "banking", "finance", "erp", "energy", "mobility",
  "healthtech", "gaming", "climate", "security",
] as const
export type TopicId = (typeof TOPICS)[number]

export const BUSINESS_MODELS = [
  "b2b-saas", "consumer", "marketplace", "enterprise", "platform",
  "ecommerce", "agency", "open-source", "deep-tech", "public",
] as const
export type BusinessModelId = (typeof BUSINESS_MODELS)[number]

/** Two published entries per topic, per person. Enforced by a guarded update. */
export const TOPIC_QUOTA = 2

export interface UserDoc {
  _id: ObjectId
  slug: string
  name: string
  email: string | null
  passwordHash: string | null
  emailVerifiedAt: Date | null
  role: RoleId
  title: string
  company: string
  location: string
  years: number
  topics: TopicId[]
  skills: string[]
  openToWork: boolean
  photoUrl: string
  portfolioUrl: string
  pitch: string
  seeded: boolean
  status: "active" | "suspended" | "deleted"
  counts: { publishedWorks: number; topicUsage: Partial<Record<TopicId, number>> }
  searchBlob: string
  createdAt: Date
  updatedAt: Date
}

/** The author fields a card needs, snapshotted onto the work. */
export interface AuthorSnapshot {
  slug: string
  name: string
  title: string
  company: string
  photoUrl: string
}

export interface WorkDetail {
  label: string
  value: string
  proof?: boolean
}

export interface WorkSection {
  heading: string
  body: string
}

export interface WorkLink {
  label: string
  href: string
}

export interface WorkDoc {
  _id: ObjectId
  slug: string
  authorId: ObjectId
  author: AuthorSnapshot
  mode: "template" | "custom"
  role: RoleId
  topics: TopicId[]
  model: BusinessModelId | null
  skills: string[]
  title: string
  summary: string
  year: number
  duration: string
  scope: string
  problem: string
  approach: string
  outcome: string
  sections: WorkSection[]
  details: WorkDetail[]
  links: WorkLink[]
  stack: string[]
  thumbnailId: ObjectId | null
  status: "draft" | "published"
  publishedAt: Date | null
  metrics: { opens: number }
  searchBlob: string
  createdAt: Date
  updatedAt: Date
}

export interface SessionDoc {
  _id: ObjectId
  userId: ObjectId
  tokenHash: string
  userAgent: string
  ip: string
  createdAt: Date
  expiresAt: Date
}

export interface TrafficEventDoc {
  _id: ObjectId
  ownerId: ObjectId
  type: "profile_view" | "work_open"
  workId: ObjectId | null
  day: string
  viewerHash: string
  createdAt: Date
}

export interface TrafficDailyDoc {
  _id: ObjectId
  ownerId: ObjectId
  day: string
  profile: number
  work: Record<string, number>
  total: number
}
