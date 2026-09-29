import type { Request, Response } from "express"
import { ReportsUsecase, reportSchema } from "../../../usecase/user/Reports/index.js"
import { sendResponse } from "../../../utils/express.js"

export const ReportsController = {
  async Add(req: Request, res: Response) {
    const input = reportSchema.parse(req.body)
    await ReportsUsecase.Add(input, req.ip ?? "0.0.0.0", req.headers["user-agent"] ?? "")
    sendResponse(res, 202, true, { received: true }, "Report received.")
  },
}
