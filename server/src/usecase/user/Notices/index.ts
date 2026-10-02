import { z } from "zod"
import Notice from "../../../models/notice.js"
import { conflict, notFound } from "../../../middleware/error.js"

export const appealSchema = z.object({
  text: z.string().trim().min(20, "Say what is wrong with the decision.").max(1500),
})

export const NoticesUsecase = {
  async GetList(userId: string) {
    return Notice.find({ userId, deletedAt: null }).sort({ createdAt: -1 }).limit(50).lean()
  },

  async MarkRead(userId: string, noticeId: string) {
    const result = await Notice.updateOne(
      { _id: noticeId, userId, readAt: null },
      { $set: { readAt: new Date() } },
    )
    if (result.matchedCount === 0) {
      const exists = await Notice.exists({ _id: noticeId, userId })
      if (!exists) throw notFound("Notice")
    }
  },

  async Appeal(userId: string, noticeId: string, text: string) {
    const result = await Notice.findOneAndUpdate(
      { _id: noticeId, userId, appeal: null },
      {
        $set: {
          appeal: {
            text,
            createdAt: new Date(),
            outcome: null,
            outcomeReason: "",
            decidedAt: null,
            decidedBy: null,
          },
        },
      },
      { new: true },
    ).lean()

    if (!result) {
      const existing = await Notice.exists({ _id: noticeId, userId })
      if (!existing) throw notFound("Notice")
      throw conflict("That decision has already been appealed.")
    }

    return result
  },
}
