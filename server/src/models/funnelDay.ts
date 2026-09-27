import { model, Schema } from "mongoose"
import type { IFunnelDay } from "../interface/IAnalytics.js"
import { auditFields } from "../utils/model.js"

const FunnelDaySchema = new Schema<IFunnelDay>(
  {
    _id:    { type: String },
    counts: { type: Map, of: Number, default: {} },

    ...auditFields,
  },
  { timestamps: false, _id: false },
)

const FunnelDay = model<IFunnelDay>("FunnelDay", FunnelDaySchema)
export default FunnelDay
