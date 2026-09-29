import type { Request, Response } from "express"
import { z } from "zod"
import { ModerationWorkUsecase } from "../../../usecase/moderation/Work/index.js"
import { sendResponse } from "../../../utils/express.js"
import { badRequest } from "../../../middleware/error.js"

const reasonSchema = z.object({
  reason: z.string().trim().min(12, "Give a reason a colleague could act on.").max(500),
})

function parseId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/i.test(value)) throw badRequest("That id is not valid.")
  return value
}

export const ModerationWorkController = {
  async Unpublish(req: Request, res: Response) {
    const { reason } = reasonSchema.parse(req.body)
    await ModerationWorkUsecase.SetPublished(parseId(req.params.id), false, reason, req.user!)
    sendResponse(res, 200, true, null, "Entry unpublished.")
  },

  async Republish(req: Request, res: Response) {
    const { reason } = reasonSchema.parse(req.body)
    await ModerationWorkUsecase.SetPublished(parseId(req.params.id), true, reason, req.user!)
    sendResponse(res, 200, true, null, "Entry republished.")
  },
}
