import { Document, Types } from "mongoose"
import type { BusinessModelId, RoleId, TopicId } from "../constant/app.js"

export interface IAuthorSnapshot {
  slug: string
  name: string
  title: string
  company: string
  photoUrl: string
  /** Denormalised — entry grid filters on these two. Fanned out on profile edit. */
  years: number
  languages: string[]
}

export interface IWorkDetail {
  label: string
  value: string
  proof: boolean
}

export interface IWorkSection {
  heading: string
  body: string
}

export interface IWorkLink {
  label: string
  href: string
}

export interface IWork {
  _id: Types.ObjectId
  slug: string
  authorId: Types.ObjectId

  /** Denormalised author snapshot — refreshed on profile change. */
  author: IAuthorSnapshot

  /**
   * Mirrors author suspension status.
   * Denormalised so public listings (which match on work alone) can hide
   * a suspended author's entries without a join.
   */
  authorSuspended: boolean

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

  /** Template mode fields */
  problem: string
  approach: string
  outcome: string

  /** Custom mode fields */
  sections: IWorkSection[]

  details: IWorkDetail[]
  links: IWorkLink[]
  stack: string[]

  /** Local path to uploaded thumbnail, null = no upload (generated cover is used). */
  thumbnailPath: string | null

  status: "draft" | "published"
  publishedAt: Date | null

  metrics: { opens: number }

  searchBlob: string

  createdAt: Date
  updatedAt: Date | null
  deletedAt: Date | null
  createdBy: Types.ObjectId | null
  updatedBy: Types.ObjectId | null
  deletedBy: Types.ObjectId | null
}

export type WorkDocument = Document & IWork
