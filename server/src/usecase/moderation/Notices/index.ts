import { z } from "zod"
import Notice from "../../../models/notice.js"
import ModerationAction from "../../../models/moderationAction.js"
import { badRequest, conflict, forbidden, notFound } from "../../../middleware/error.js"
import { ModerationWorkUsecase } from "../Work/index.js"
import { ModerationPeopleUsecase } from "../People/index.js"
import type { AuthUser } from "../../../middleware/userAuth.js"
import type { Types } from "mongoose"

export const appealDecisionSchema = z.object({
  outcome: z.enum(["upheld", "overturned"]),
  reason:  z.string().trim().min(12, "Give a reason a colleague could act on.").max(500),
})

export const ModerationNoticesUsecase = {
  async GetOpenAppeals() {
    return Notice.find({ appeal: { $ne: null }, "appeal.outcome": null }).sort({ "appeal.createdAt": 1 }).limit(100).lean()
  },

  async DecideAppeal(noticeId: string, outcome: "upheld" | "overturned", reason: string, actor: AuthUser) {
    const notice = await Notice.findOne({ _id: noticeId }).lean()
    if (!notice) throw notFound("Notice")
    if (!notice.appeal) throw badRequest("That notice has not been appealed.")
    if (notice.appeal.outcome) throw conflict("That appeal has already been decided.")
    if ((notice.actorId as unknown as Types.ObjectId).toString() === actor.id) {
      throw forbidden("An appeal has to be reviewed by someone other than whoever took the decision.")
    }

    if (outcome === "overturned" && notice.targetId) {
      if (notice.action === "unpublish" && notice.targetKind === "work") {
        await ModerationWorkUsecase.SetPublished(notice.targetId.toString(), true, `Appeal overturned the decision: ${reason}`, actor)
      } else if (notice.action === "suspend" && notice.targetKind === "user") {
        await ModerationPeopleUsecase.SetSuspended(notice.targetId.toString(), false, `Appeal overturned the decision: ${reason}`, actor)
      }
    }

    await Notice.updateOne(
      { _id: noticeId, "appeal.outcome": null },
      { $set: { "appeal.outcome": outcome, "appeal.outcomeReason": reason, "appeal.decidedAt": new Date(), "appeal.decidedBy": actor.id } },
    )

    await ModerationAction.create({
      action:      "appeal",
      targetKind:  notice.targetKind,
      targetId:    notice.targetId,
      targetLabel: notice.targetLabel,
      reason:      `Appeal ${outcome}: ${reason}`,
      actorId:     actor.id,
      actorSlug:   actor.slug,
    })
  },
}
