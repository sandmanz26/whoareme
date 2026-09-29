import User from "../../../models/user.js"
import Work from "../../../models/work.js"
import ModerationAction from "../../../models/moderationAction.js"
import Notice from "../../../models/notice.js"
import { notFound } from "../../../middleware/error.js"
import type { AuthUser } from "../../../middleware/userAuth.js"
import type { ModerationActionId, ModerationTargetKind } from "../../../constant/app.js"
import type { Types } from "mongoose"

async function recordAndNotify(entry: {
  action: ModerationActionId
  targetKind: ModerationTargetKind
  targetId: Types.ObjectId
  targetLabel: string
  reason: string
  recipientId: Types.ObjectId
}, actor: AuthUser) {
  const action = await ModerationAction.create({
    action:      entry.action,
    targetKind:  entry.targetKind,
    targetId:    entry.targetId,
    targetLabel: entry.targetLabel,
    reason:      entry.reason,
    actorId:     actor.id,
    actorSlug:   actor.slug,
  })

  await Notice.create({
    userId:      entry.recipientId,
    actionId:    action._id,
    action:      entry.action,
    targetKind:  entry.targetKind,
    targetId:    entry.targetId,
    targetLabel: entry.targetLabel,
    reason:      entry.reason,
    actorId:     actor.id,
    readAt:      null,
    appeal:      null,
  })
}

export const ModerationPeopleUsecase = {
  async SetSuspended(userId: string, suspended: boolean, reason: string, actor: AuthUser) {
    const user = await User.findOne({ _id: userId, deletedAt: null }).lean()
    if (!user) throw notFound("Person")

    await User.updateOne({ _id: userId }, { $set: { status: suspended ? "suspended" : "active", updatedAt: new Date() } })
    await Work.updateMany({ authorId: userId }, { $set: { authorSuspended: suspended } })

    await recordAndNotify(
      {
        action:      suspended ? "suspend" : "reinstate",
        targetKind:  "user",
        targetId:    user._id as unknown as Types.ObjectId,
        targetLabel: user.name,
        reason,
        recipientId: user._id as unknown as Types.ObjectId,
      },
      actor,
    )
  },

  async GetAuditLog() {
    return ModerationAction.find({}).sort({ createdAt: -1 }).limit(100).lean()
  },
}
