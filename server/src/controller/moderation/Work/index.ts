import type { Request, Response } from "express"
import { z } from "zod"
import WorkModel from "../../../models/work.js"
import { ModerationWorkUsecase } from "../../../usecase/moderation/Work/index.js"
import { sendResponse } from "../../../utils/express.js"
import { badRequest, notFound } from "../../../middleware/error.js"

const reasonSchema = z.object({
  reason: z.string().trim().min(12, "Give a reason a colleague could act on.").max(500),
})

async function workIdFromSlug(slug: unknown): Promise<string> {
  if (typeof slug !== "string" || !slug) throw badRequest("That slug is not valid.")
  const work = await WorkModel.findOne({ slug, deletedAt: null }).select("_id").lean()
  if (!work) throw notFound("Entry")
  return work._id.toString()
}

export const ModerationWorkController = {
  async Unpublish(req: Request, res: Response) {
    const { reason } = reasonSchema.parse(req.body)
    const workId = await workIdFromSlug(req.params.id)
    await ModerationWorkUsecase.SetPublished(workId, false, reason, req.user!)
    sendResponse(res, 200, true, null, "Entry unpublished.")
  },

  async Republish(req: Request, res: Response) {
    const { reason } = reasonSchema.parse(req.body)
    const workId = await workIdFromSlug(req.params.id)
    await ModerationWorkUsecase.SetPublished(workId, true, reason, req.user!)
    sendResponse(res, 200, true, null, "Entry republished.")
  },
}