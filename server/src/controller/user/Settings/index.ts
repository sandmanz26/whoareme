import type { Request, Response } from "express"
import { SettingsUsecase } from "../../../usecase/user/Settings/index.js"
import { sendResponse } from "../../../utils/express.js"

export const SettingsController = {
  async Get(_req: Request, res: Response) {
    const data = await SettingsUsecase.Get()
    sendResponse(res, 200, true, data, "")
  },
}
