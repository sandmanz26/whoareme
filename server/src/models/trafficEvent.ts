import { model, Schema } from "mongoose"
import type { ITrafficEvent } from "../interface/ITraffic.js"
import { auditFields } from "../utils/model.js"

const TrafficEventSchema = new Schema<ITrafficEvent>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    workId: { type: Schema.Types.ObjectId, ref: "Work", default: null },
    day: { type: String, required: true },
    viewerHash: { type: String, required: true },

    ...auditFields,
  },
  { timestamps: false },
)

TrafficEventSchema.index({ ownerId: 1, day: 1 })
TrafficEventSchema.index(
  { day: 1, viewerHash: 1, ownerId: 1, type: 1, workId: 1 },
  { unique: true },
)

const TrafficEvent = model<ITrafficEvent>("TrafficEvent", TrafficEventSchema)
export default TrafficEvent
