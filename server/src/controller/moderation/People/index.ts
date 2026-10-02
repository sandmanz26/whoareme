import type { Request, Response } from "express"
import { z } from "zod"
import User from "../../../models/user.js"
import { ModerationPeopleUsecase } from "../../../usecase/moderation/People/index.js"
import { sendResponse } from "../../../utils/express.js"
import { badRequest, notFound } from "../../../middleware/error.js"

const reasonSchema = z.object({
  reason: z.string().trim().min(12, "Give a reason a colleague could act on.").max(500),
})

async function userIdFromSlug(slug: unknown): Promise<string> {
  if (typeof slug !== "string" || !slug) throw badRequest("That slug is not valid.")
  const user = await User.findOne({ slug, deletedAt: null }).select("_id").lean()
  if (!user) throw notFound("Person")
  return user._id.toString()
}

export const ModerationPeopleController = {
  async Suspend(req: Request, res: Response) {
    const { reason } = reasonSchema.parse(req.body)
    const userId = await userIdFromSlug(req.params.id)
    await ModerationPeopleUsecase.SetSuspended(userId, true, reason, req.user!)
    sendResponse(res, 200, true, null, "Person suspended.")
  },

  async Reinstate(req: Request, res: Response) {
    const { reason } = reasonSchema.parse(req.body)
    const userId = await userIdFromSlug(req.params.id)
    await ModerationPeopleUsecase.SetSuspended(userId, false, reason, req.user!)
    sendResponse(res, 200, true, null, "Person reinstated.")
  },

  async GetAuditLog(_req: Request, res: Response) {
    const items = await ModerationPeopleUsecase.GetAuditLog()
    sendResponse(res, 200, true, { items }, "")
  },
}
