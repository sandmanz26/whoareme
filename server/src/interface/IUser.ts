import { Document, Types } from "mongoose"
import type { AccessLevel, RoleId, TopicId } from "../constant/app.js"

export interface IUser {
  _id: Types.ObjectId
  slug: string
  name: string
  email: string | null
  passwordHash: string | null
  emailVerifiedAt: Date | null
  emailVerifyTokenHash: string | null
  emailVerifyExpiresAt: Date | null
  passwordResetTokenHash: string | null
  passwordResetExpiresAt: Date | null

  role: RoleId
  title: string
  company: string
  location: string
  years: number
  languages: string[]
  topics: TopicId[]
  skills: string[]
  openToWork: boolean
  photoUrl: string
  portfolioUrl: string
  pitch: string

  /** Current active token. Null = logged out. 1 user = 1 active token. */
  token: string | null

  seeded: boolean
  status: "active" | "suspended"
  access: AccessLevel

  counts: {
    publishedWorks: number
    topicUsage: Partial<Record<TopicId, number>>
  }

  searchBlob: string

  createdAt: Date
  updatedAt: Date | null
  deletedAt: Date | null
  createdBy: Types.ObjectId | null
  updatedBy: Types.ObjectId | null
  deletedBy: Types.ObjectId | null
}

export type UserDocument = Document & IUser
