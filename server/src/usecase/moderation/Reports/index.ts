import Report from "../../../models/report.js"
import ModerationAction from "../../../models/moderationAction.js"
import { notFound } from "../../../middleware/error.js"
import type { AuthUser } from "../../../middleware/userAuth.js"
import type { ModerationActionId, ModerationTargetKind } from "../../../constant/app.js"
import type { Types } from "mongoose"

export const ModerationReportsUsecase = {
  async GetList() {
    return Report.find({ resolvedAt: null }).sort({ createdAt: -1 }).limit(100).lean()
  },

  async Resolve(reportId: string, reason: string, actor: AuthUser) {
    const report = await Report.findOneAndUpdate(
      { _id: reportId, resolvedAt: null },
      { $set: { resolvedAt: new Date(), resolvedBy: actor.id } },
    ).lean()
    if (!report) throw notFound("Report")

    await ModerationAction.create({
      action:      "dismiss" as ModerationActionId,
      targetKind:  report.targetKind as ModerationTargetKind,
      targetId:    report.targetId as unknown as Types.ObjectId,
      targetLabel: "Report closed",
      reason,
      actorId:     actor.id,
      actorSlug:   actor.slug,
    })
  },
}
