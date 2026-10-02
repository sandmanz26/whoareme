import { model, Schema } from "mongoose"
import type { INotice } from "../interface/IModeration.js"
import { auditFields } from "../utils/model.js"

const NoticeAppealSchema = new Schema(
  {
    text: { type: String, required: true },
    createdAt: { type: Date, required: true },
    outcome: { type: String, default: null },
    outcomeReason: { type: String, default: "" },
    decidedAt: { type: Date, default: null },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false },
)

const NoticeSchema = new Schema<INotice>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actionId: { type: Schema.Types.ObjectId, ref: "ModerationAction", required: true },
    action: { type: String, required: true },
    targetKind: { type: String, default: null },
    targetId: { type: Schema.Types.ObjectId, default: null },
    targetLabel: { type: String, required: true },
    reason: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    readAt: { type: Date, default: null },
    appeal: { type: NoticeAppealSchema, default: null },

    ...auditFields,
  },
  { timestamps: false },
)

NoticeSchema.index({ userId: 1, readAt: 1 })
NoticeSchema.index({ actionId: 1 }, { unique: true })

const Notice = model<INotice>("Notice", NoticeSchema)
export default Notice
