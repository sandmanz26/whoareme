import { model, Schema } from "mongoose"
import type { ISiteSettings } from "../interface/ISettings.js"
import { auditFields } from "../utils/model.js"

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    _id: { type: String, default: "site" },

    contact: {
      email:        { type: String, default: "" },
      location:     { type: String, default: "" },
      responseTime: { type: String, default: "" },
    },

    copy:          { type: Map, of: String, default: {} },
    disabledRoles: { type: [String], default: [] },

    ...auditFields,
  },
  { timestamps: false, _id: false },
)

const SiteSettings = model<ISiteSettings>("SiteSettings", SiteSettingsSchema)
export default SiteSettings
