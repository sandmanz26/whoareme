import WorkModel from "../../../models/work.js"
import User from "../../../models/user.js"
import { notFound, QuotaError } from "../../../middleware/error.js"
import type { AuthUser } from "../../../middleware/userAuth.js"
import { TOPIC_QUOTA } from "../../../constant/app.js"
import type { Types } from "mongoose"
import { recordAndNotify } from "../record.js"

export const ModerationWorkUsecase = {
  async SetPublished(workId: string, published: boolean, reason: string, actor: AuthUser) {
    const work = await WorkModel.findOne({ _id: workId, deletedAt: null }).lean()
    if (!work) throw notFound("Entry")

    const alreadyThere = published ? work.status === "published" : work.status === "draft"
    if (alreadyThere) return

    const topics = work.topics as string[]
    const now = new Date()

    // Republishing counts against the same two-per-topic cap the author's own
    // publish enforces. Without this guard a moderator could push a person over
    // a load-bearing product rule through a moderation action.
    if (published) {
      const guard = await User.updateOne(
        {
          _id: work.authorId,
          $nor: topics.map((t) => ({ [`counts.topicUsage.${t}`]: { $gte: TOPIC_QUOTA } })),
        },
        {
          $inc: {
            "counts.publishedWorks": 1,
            ...Object.fromEntries(topics.map((t) => [`counts.topicUsage.${t}`, 1])),
          },
        },
      )
      if (guard.matchedCount === 0) {
        const fresh = await User.findOne({ _id: work.authorId }, "counts").lean()
        const counts = fresh?.counts as unknown as
          { topicUsage?: Record<string, number> } | undefined
        const full = topics.filter((t) => (counts?.topicUsage?.[t] ?? 0) >= TOPIC_QUOTA)
        throw new QuotaError(full.length > 0 ? full : topics)
      }
    }

    try {
      await WorkModel.updateOne(
        { _id: workId },
        {
          $set: {
            status: (published ? "published" : "draft") as "published" | "draft",
            publishedAt: published ? now : null,
            updatedAt: now,
          },
        },
      )
    } catch (err) {
      // Compensate the counter if the status write failed after it.
      if (published) {
        await User.updateOne(
          { _id: work.authorId },
          {
            $inc: {
              "counts.publishedWorks": -1,
              ...Object.fromEntries(topics.map((t) => [`counts.topicUsage.${t}`, -1])),
            },
          },
        )
      }
      throw err
    }

    if (!published) {
      try {
        await User.updateOne(
          { _id: work.authorId },
          {
            $inc: {
              "counts.publishedWorks": -1,
              ...Object.fromEntries(topics.map((t) => [`counts.topicUsage.${t}`, -1])),
            },
          },
        )
      } catch (err) {
        // Put it back so the status and the counters cannot disagree.
        await WorkModel.updateOne(
          { _id: workId },
          {
            $set: {
              status: "published" as const,
              publishedAt: work.publishedAt ?? now,
              updatedAt: now,
            },
          },
        ).catch(() => {})
        throw err
      }
    }

    await recordAndNotify(
      {
        action: published ? "republish" : "unpublish",
        targetKind: "work",
        targetId: work._id as unknown as Types.ObjectId,
        targetLabel: work.title,
        reason,
        recipientId: work.authorId as unknown as Types.ObjectId,
      },
      actor,
    )
  },
}
