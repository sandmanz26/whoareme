import type { Document, Types } from "mongoose"

export interface ITrafficEvent {
  _id: Types.ObjectId
  ownerId: Types.ObjectId
  type: "profile_view" | "work_open"
  workId: Types.ObjectId | null
  day: string
  /** Salted daily hash of IP + UA. Identifies nobody; rotates daily. */
  viewerHash: string

  createdAt: Date
  updatedAt: Date | null
  deletedAt: Date | null
  createdBy: Types.ObjectId | null
  updatedBy: Types.ObjectId | null
  deletedBy: Types.ObjectId | null
}

export type TrafficEventDocument = Document & ITrafficEvent

export interface ITrafficDaily {
  _id: Types.ObjectId
  ownerId: Types.ObjectId
  day: string
  profile: number
  work: Record<string, number>
  total: number

  createdAt: Date
  updatedAt: Date | null
  deletedAt: Date | null
  createdBy: Types.ObjectId | null
  updatedBy: Types.ObjectId | null
  deletedBy: Types.ObjectId | null
}

export type TrafficDailyDocument = Document & ITrafficDaily
