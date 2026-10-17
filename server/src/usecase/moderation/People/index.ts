import User from "../../../models/user.js"
import Work from "../../../models/work.js"
import ModerationAction from "../../../models/moderationAction.js"
import { notFound } from "../../../middleware/error.js"
import type { AuthUser } from "../../../middleware/userAuth.js"
import type { Types } from "mongoose"
import { recordAndNotify } from "../record.js"

export const ModerationPeopleUsecase = {
  async SetSuspended(userId: string, suspended: boolean, reason: string, actor: AuthUser) {
    const user = await User.findOne({ _id: userId, deletedAt: null }).lean()
    if (!user) throw notFound("Person")

    const previousStatus = user.status ?? "active"
    const now = new Date()
    try {
      await User.updateOne(
        { _id: userId },
        { $set: { status: suspended ? "suspended" : "active", updatedAt: now } },
      )
      await Work.updateMany({ authorId: userId }, { $set: { authorSuspended: suspended } })
    } catch (err) {
      // The status and the denormalised flag on the works have to move together.
      await User.updateOne(
        { _id: userId },
        { $set: { status: previousStatus, updatedAt: new Date() } },
      ).catch(() => {})
      throw err
    }

    await recordAndNotify(
      {
        action: suspended ? "suspend" : "reinstate",
        targetKind: "user",
        targetId: user._id as unknown as Types.ObjectId,
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
