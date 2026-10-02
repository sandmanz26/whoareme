import type { Document, Types } from "mongoose"
import type { RoleId } from "../constant/app.js"

export interface ISiteSettings {
  _id: "site"
  contact: {
    email: string
    location: string
    responseTime: string
  }
  /** Copy overrides keyed by slot ids the SPA registers. */
  copy: Record<string, string>
  /** Crafts withdrawn from browse controls. Not a content filter. */
  disabledRoles: RoleId[]

  createdAt: Date
  updatedAt: Date | null
  deletedAt: Date | null
  createdBy: Types.ObjectId | null
  updatedBy: Types.ObjectId | null
  deletedBy: Types.ObjectId | null
}

export type SiteSettingsDocument = Document & ISiteSettings
