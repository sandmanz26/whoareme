import type { Request, Response } from "express"
import {
  ModerationSettingsUsecase,
  settingsPatchSchema,
} from "../../../usecase/moderation/Settings/index.js"
import { sendResponse } from "../../../utils/express.js"

export const ModerationSettingsController = {
  async Get(_req: Request, res: Response) {
    const data = await ModerationSettingsUsecase.Get()
    sendResponse(res, 200, true, data, "")
  },

  async Update(req: Request, res: Response) {
    const { reason, ...patch } = settingsPatchSchema.parse(req.body)
    const data = await ModerationSettingsUsecase.Update(patch, reason, req.user!)
    sendResponse(res, 200, true, data, "Settings updated.")
  },
}
