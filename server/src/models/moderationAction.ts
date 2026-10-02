import { model, Schema } from "mongoose"
import type { IModerationAction } from "../interface/IModeration.js"
import { auditFields } from "../utils/model.js"

const ModerationActionSchema = new Schema<IModerationAction>(
  {
    action: { type: String, required: true },
    targetKind: { type: String, default: null },
    targetId: { type: Schema.Types.ObjectId, default: null },
    targetLabel: { type: String, required: true },
    reason: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorSlug: { type: String, required: true },

    ...auditFields,
  },
  { timestamps: false },
)

ModerationActionSchema.index({ actorId: 1 })
ModerationActionSchema.index({ targetKind: 1, targetId: 1 })
ModerationActionSchema.index({ createdAt: -1 })

const ModerationAction = model<IModerationAction>("ModerationAction", ModerationActionSchema)
export default ModerationAction
