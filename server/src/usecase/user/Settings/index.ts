import SiteSettings from "../../../models/siteSettings.js"

const DEFAULT_SETTINGS = {
  contact: {
    email: "hello@whoareyou.directory",
    location: "Jakarta, ID",
    responseTime: "We answer within two working days.",
  },
  copy: {} as Record<string, string>,
  disabledRoles: [] as string[],
}

export const SettingsUsecase = {
  async Get() {
    const doc = await SiteSettings.findOne({ _id: "site" }).lean()
    if (!doc) return DEFAULT_SETTINGS
    return { contact: doc.contact, copy: doc.copy, disabledRoles: doc.disabledRoles }
  },
}
