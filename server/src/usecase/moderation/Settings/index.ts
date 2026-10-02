import { z } from "zod"
import SiteSettings from "../../../models/siteSettings.js"
import ModerationAction from "../../../models/moderationAction.js"
import { ROLES } from "../../../constant/app.js"
import type { AuthUser } from "../../../middleware/userAuth.js"

export const settingsPatchSchema = z
  .object({
    contact: z
      .object({
        email: z.string().email(),
        location: z.string().trim().min(1).max(120),
        responseTime: z.string().trim().max(200),
      })
      .optional(),
    copy: z.record(z.string(), z.string().max(2000)).optional(),
    disabledRoles: z.array(z.enum(ROLES)).optional(),
    reason: z.string().trim().min(12).max(500),
  })
  .refine((v) => v.contact !== undefined || v.copy !== undefined || v.disabledRoles !== undefined, {
    message: "Nothing to change.",
  })

const DEFAULT_SETTINGS = {
  contact: {
    email: "hello@whoareyou.directory",
    location: "Jakarta, ID",
    responseTime: "We answer within two working days.",
  },
  copy: {} as Record<string, string>,
  disabledRoles: [] as string[],
}

export const ModerationSettingsUsecase = {
  async Get() {
    const doc = await SiteSettings.findOne({ _id: "site" }).lean()
    return doc ?? DEFAULT_SETTINGS
  },

  async Update(
    patch: Omit<z.infer<typeof settingsPatchSchema>, "reason">,
    reason: string,
    actor: AuthUser,
  ) {
    const result = await SiteSettings.findOneAndUpdate(
      { _id: "site" },
      {
        $set: { ...patch, updatedAt: new Date(), updatedBy: actor.id },
        $setOnInsert: {
          ...(!patch.contact ? { contact: DEFAULT_SETTINGS.contact } : {}),
          ...(!patch.copy ? { copy: DEFAULT_SETTINGS.copy } : {}),
          ...(!patch.disabledRoles ? { disabledRoles: DEFAULT_SETTINGS.disabledRoles } : {}),
        },
      },
      { upsert: true, new: true },
    ).lean()

    await ModerationAction.create({
      action: "settings",
      targetKind: null,
      targetId: null,
      targetLabel: Object.keys(patch).join(", ") || "settings",
      reason,
      actorId: actor.id,
      actorSlug: actor.slug,
    })

    return result ?? DEFAULT_SETTINGS
  },
}
