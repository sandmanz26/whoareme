import { z } from "zod"
import Report from "../../../models/report.js"
import Work from "../../../models/work.js"
import User from "../../../models/user.js"
import { notFound } from "../../../middleware/error.js"
import { REPORT_REASONS } from "../../../constant/app.js"
import { viewerHash } from "../../../utils/hash.js"

export const reportSchema = z.object({
  targetKind: z.enum(["work", "user"]),
  targetId:   z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id."),
  reason:     z.enum(REPORT_REASONS),
  note:       z.string().trim().max(1000).default(""),
})

export const ReportsUsecase = {
  async Add(input: z.infer<typeof reportSchema>, ip: string, userAgent: string) {
    const day = new Date().toISOString().slice(0, 10)
    const hash = viewerHash(ip, userAgent, day)

    const exists = input.targetKind === "work"
      ? await Work.countDocuments({ _id: input.targetId, deletedAt: null })
      : await User.countDocuments({ _id: input.targetId, deletedAt: null })

    if (!exists) throw notFound(input.targetKind === "work" ? "Entry" : "Person")

    await Report.create({
      targetKind:   input.targetKind,
      targetId:     input.targetId,
      reason:       input.reason,
      note:         input.note,
      reporterHash: hash,
    }).catch((err: { code?: number }) => {
      if (err.code !== 11000) throw err
    })
  },
}
