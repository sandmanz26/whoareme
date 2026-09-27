import WorkModel from "../../../models/work.js"
import User from "../../../models/user.js"
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

export const ModerationWorkUsecase = {
  async SetPublished(workId: string, published: boolean, reason: string, actor: AuthUser) {
    const work = await WorkModel.findOne({ _id: workId, deletedAt: null }).lean()
    if (!work) throw notFound("Entry")

    const alreadyThere = published ? work.status === "published" : work.status === "draft"
    if (alreadyThere) return

    const delta = published ? 1 : -1
    await WorkModel.updateOne(
      { _id: workId },
      { $set: { status: (published ? "published" : "draft") as "published" | "draft", publishedAt: published ? new Date() : null, updatedAt: new Date() } },
    )
    await User.updateOne(
      { _id: work.authorId },
      { $inc: { "counts.publishedWorks": delta, ...Object.fromEntries((work.topics as string[]).map((t) => [`counts.topicUsage.${t}`, delta])) } },
    )
    await recordAndNotify(
      {
        action:      published ? "republish" : "unpublish",
        targetKind:  "work",
        targetId:    work._id as unknown as Types.ObjectId,
        targetLabel: work.title,
        reason,
        recipientId: work.authorId as unknown as Types.ObjectId,
      },
      actor,
    )
  },
}
