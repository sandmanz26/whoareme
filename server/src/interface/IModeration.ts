import { Document, Types } from "mongoose"
import type { ModerationActionId, ModerationTargetKind, ReportReason } from "../constant/app.js"

export interface IReport {
  _id: Types.ObjectId
  targetKind: ModerationTargetKind
  targetId: Types.ObjectId
  reason: ReportReason
  note: string
  /** Salted daily hash of IP + UA — de-duplicates, identifies nobody. */
  reporterHash: string
  resolvedAt: Date | null
  resolvedBy: Types.ObjectId | null

  createdAt: Date
  updatedAt: Date | null
  deletedAt: Date | null
  createdBy: Types.ObjectId | null
  updatedBy: Types.ObjectId | null
  deletedBy: Types.ObjectId | null
}

export type ReportDocument = Document & IReport

/** Append-only audit log. Nothing in the API updates or deletes a row here. */
export interface IModerationAction {
  _id: Types.ObjectId
  action: ModerationActionId
  targetKind: ModerationTargetKind | null
  targetId: Types.ObjectId | null
  /** Denormalised so the log still reads if the target is later removed. */
  targetLabel: string
  reason: string
  actorId: Types.ObjectId
  actorSlug: string

  createdAt: Date
  updatedAt: Date | null
  deletedAt: Date | null
  createdBy: Types.ObjectId | null
  updatedBy: Types.ObjectId | null
  deletedBy: Types.ObjectId | null
}

export type ModerationActionDocument = Document & IModerationAction

export interface INoticeAppeal {
  text: string
  createdAt: Date
  outcome: "upheld" | "overturned" | null
  outcomeReason: string
  decidedAt: Date | null
  /** Kept so an appeal can refuse to be reviewed by the original actor. */
  decidedBy: Types.ObjectId | null
}

export interface INotice {
  _id: Types.ObjectId
  /** Who the notice is addressed to. */
  userId: Types.ObjectId
  /** The audit row this restates. */
  actionId: Types.ObjectId
  action: ModerationActionId
  targetKind: ModerationTargetKind | null
  targetId: Types.ObjectId | null
  targetLabel: string
  reason: string
  /** Who decided — kept so an appeal reviewer cannot be the same person. */
  actorId: Types.ObjectId
  readAt: Date | null
  appeal: INoticeAppeal | null

  createdAt: Date
  updatedAt: Date | null
  deletedAt: Date | null
  createdBy: Types.ObjectId | null
  updatedBy: Types.ObjectId | null
  deletedBy: Types.ObjectId | null
}

export type NoticeDocument = Document & INotice
