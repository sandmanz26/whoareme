import type { Request, Response } from "express"
import { z } from "zod"
import { ModerationPeopleUsecase } from "../../../usecase/moderation/People/index.js"
import { sendResponse } from "../../../utils/express.js"
import { badRequest } from "../../../middleware/error.js"

const reasonSchema = z.object({
  reason: z.string().trim().min(12, "Give a reason a colleague could act on.").max(500),
})

function parseId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/i.test(value)) throw badRequest("That id is not valid.")
  return value
}

export const ModerationPeopleController = {
  async Suspend(req: Request, res: Response) {
    const { reason } = reasonSchema.parse(req.body)
    await ModerationPeopleUsecase.SetSuspended(parseId(req.params.id), true, reason, req.user!)
    sendResponse(res, 200, true, null, "Person suspended.")
  },

  async Reinstate(req: Request, res: Response) {
    const { reason } = reasonSchema.parse(req.body)
    await ModerationPeopleUsecase.SetSuspended(parseId(req.params.id), false, reason, req.user!)
    sendResponse(res, 200, true, null, "Person reinstated.")
  },

  async GetAuditLog(_req: Request, res: Response) {
    const items = await ModerationPeopleUsecase.GetAuditLog()
    sendResponse(res, 200, true, { items }, "")
  },
}
