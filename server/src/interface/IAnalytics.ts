import { Document, Types } from "mongoose"
import type { FunnelStep } from "../constant/app.js"

/**
 * One document per day. Counters only — no identifiers, no paths.
 * The $jsonSchema equivalent is enforced at the application layer.
 */
export interface IFunnelDay {
  _id: string
  counts: Partial<Record<FunnelStep, number>>
  updatedAt: Date | null
  deletedAt: Date | null
  createdBy: Types.ObjectId | null
  updatedBy: Types.ObjectId | null
  deletedBy: Types.ObjectId | null
  createdAt: Date
}

export type FunnelDayDocument = Document & IFunnelDay
