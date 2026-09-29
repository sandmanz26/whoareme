import type { Request, Response } from "express"
import { z } from "zod"
import { ModerationReportsUsecase } from "../../../usecase/moderation/Reports/index.js"
import { sendResponse } from "../../../utils/express.js"
import { badRequest } from "../../../middleware/error.js"

const reasonSchema = z.object({
  reason: z.string().trim().min(12, "Give a reason a colleague could act on.").max(500),
})

function parseId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/i.test(value)) throw badRequest("That id is not valid.")
  return value
}

export const ModerationReportsController = {
  async GetList(_req: Request, res: Response) {
    const items = await ModerationReportsUsecase.GetList()
    sendResponse(res, 200, true, { items }, "")
  },

  async Resolve(req: Request, res: Response) {
    const { reason } = reasonSchema.parse(req.body)
    await ModerationReportsUsecase.Resolve(parseId(req.params.id), reason, req.user!)
    sendResponse(res, 200, true, null, "Report resolved.")
  },
}
