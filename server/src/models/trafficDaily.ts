import { model, Schema } from "mongoose"
import type { ITrafficDaily } from "../interface/ITraffic.js"
import { auditFields } from "../utils/model.js"

const TrafficDailySchema = new Schema<ITrafficDaily>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true },
    profile: { type: Number, default: 0 },
    work: { type: Map, of: Number, default: {} },
    total: { type: Number, default: 0 },

    ...auditFields,
  },
  { timestamps: false },
)

TrafficDailySchema.index({ ownerId: 1, day: -1 })
TrafficDailySchema.index({ ownerId: 1, day: 1 }, { unique: true })

const TrafficDaily = model<ITrafficDaily>("TrafficDaily", TrafficDailySchema)
export default TrafficDaily
