import type { Request, Response } from "express"
import {
  ModerationNoticesUsecase,
  appealDecisionSchema,
} from "../../../usecase/moderation/Notices/index.js"
import { sendResponse } from "../../../utils/express.js"
import { badRequest } from "../../../middleware/error.js"

function parseId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/i.test(value))
    throw badRequest("That id is not valid.")
  return value
}

export const ModerationNoticesController = {
  async GetOpenAppeals(_req: Request, res: Response) {
    const items = await ModerationNoticesUsecase.GetOpenAppeals()
    sendResponse(res, 200, true, { items }, "")
  },

  async DecideAppeal(req: Request, res: Response) {
    const { outcome, reason } = appealDecisionSchema.parse(req.body)
    await ModerationNoticesUsecase.DecideAppeal(parseId(req.params.id), outcome, reason, req.user!)
    sendResponse(res, 200, true, null, "Appeal decided.")
  },
}
