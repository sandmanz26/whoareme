import type { Request, Response } from "express"
import { z } from "zod"
import { TrafficUsecase } from "../../../usecase/user/Traffic/index.js"
import { sendResponse } from "../../../utils/express.js"

const rangeSchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
})

export const TrafficController = {
  async GetMySummary(req: Request, res: Response) {
    const { days } = rangeSchema.parse(req.query)
    const data = await TrafficUsecase.GetMySummary(req.user!.id, days)
    sendResponse(res, 200, true, data, "")
  },
}
