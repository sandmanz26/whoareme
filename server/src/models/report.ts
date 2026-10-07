import { model, Schema } from "mongoose"
import type { IReport } from "../interface/IModeration.js"
import { auditFields } from "../utils/model.js"

const ReportSchema = new Schema<IReport>(
  {
    targetKind: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true },
    note: { type: String, default: "" },
    reporterHash: { type: String, required: true },
    day: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    ...auditFields,
  },
  { timestamps: false },
)

ReportSchema.index({ targetKind: 1, targetId: 1 })
ReportSchema.index({ resolvedAt: 1 })
// One report per reporter, target and reason per day. Including the day means a
// different reason on the same target is not silently dropped, and a bad report
// can be refiled after it is resolved.
ReportSchema.index(
  { reporterHash: 1, targetKind: 1, targetId: 1, reason: 1, day: 1 },
  { unique: true },
)

const Report = model<IReport>("Report", ReportSchema)
export default Report
