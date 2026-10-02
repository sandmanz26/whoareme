import { z } from "zod"
import Report from "../../../models/report.js"
import Work from "../../../models/work.js"
import User from "../../../models/user.js"
import { notFound } from "../../../middleware/error.js"
import { REPORT_REASONS } from "../../../constant/app.js"
import { viewerHash } from "../../../utils/hash.js"

export const reportSchema = z.object({
  targetKind: z.enum(["work", "user"]),
  targetId: z.string().trim().min(1).max(120),
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(1000).default(""),
})

export const ReportsUsecase = {
  async Add(input: z.infer<typeof reportSchema>, ip: string, userAgent: string) {
    const day = new Date().toISOString().slice(0, 10)
    const hash = viewerHash(ip, userAgent, day)

    const target =
      input.targetKind === "work"
        ? await Work.findOne({ slug: input.targetId, deletedAt: null }).select("_id").lean()
        : await User.findOne({ slug: input.targetId, deletedAt: null }).select("_id").lean()

    if (!target) throw notFound(input.targetKind === "work" ? "Entry" : "Person")

    await Report.create({
      targetKind: input.targetKind,
      targetId: target._id,
      reason: input.reason,
      note: input.note,
      reporterHash: hash,
    }).catch((err: { code?: number }) => {
      if (err.code !== 11000) throw err
    })
  },
}
