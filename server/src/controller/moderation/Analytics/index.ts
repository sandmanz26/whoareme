import type { Request, Response } from "express"
import { z } from "zod"
import { AnalyticsUsecase, ingestSchema } from "../../../usecase/moderation/Analytics/index.js"
import { sendResponse } from "../../../utils/express.js"

const windowSchema = z.object({
  days: z.coerce.number().int().min(1).max(180).default(30),
})

export const AnalyticsController = {
  async RecordFunnel(req: Request, res: Response) {
    const { counts } = ingestSchema.parse(req.body)
    await AnalyticsUsecase.RecordFunnel(counts)
    sendResponse(res, 204, true, null, "")
  },

  async GetFunnel(req: Request, res: Response) {
    const { days } = windowSchema.parse(req.query)
    const data = await AnalyticsUsecase.GetFunnel(days)
    sendResponse(res, 200, true, data, "")
  },
}
