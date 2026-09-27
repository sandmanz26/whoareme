import { Schema } from "mongoose"

/**
 * Standard audit trail fields — mixed into every schema.
 * - createdAt/updatedAt/deletedAt: document timeline
 * - createdBy/updatedBy/deletedBy: who performed each action (accountability)
 * - deletedAt: null = active, Date = soft-deleted (data is never lost)
 */
export const auditFields = {
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}
