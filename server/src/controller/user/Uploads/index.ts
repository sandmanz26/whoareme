import type { Request, Response } from "express"
import { UploadsUsecase } from "../../../usecase/user/Uploads/index.js"
import { sendResponse } from "../../../utils/express.js"
import { badRequest } from "../../../middleware/error.js"

export const UploadsController = {
  async AddThumbnail(req: Request, res: Response) {
    if (!req.file) throw badRequest("No file uploaded. Send it as `file`.")
    const data = await UploadsUsecase.AddThumbnail(req.user!.id, String(req.params["id"]), req.file.filename)
    sendResponse(res, 201, true, data, "Thumbnail uploaded.")
  },

  async DeleteThumbnail(req: Request, res: Response) {
    await UploadsUsecase.DeleteThumbnail(req.user!.id, String(req.params["id"]))
    sendResponse(res, 200, true, null, "Thumbnail removed.")
  },

  async AddPhoto(req: Request, res: Response) {
    if (!req.file) throw badRequest("No file uploaded. Send it as `file`.")
    const data = await UploadsUsecase.AddPhoto(req.user!.id, req.file.filename)
    sendResponse(res, 201, true, data, "Photo uploaded.")
  },

  async DeletePhoto(req: Request, res: Response) {
    await UploadsUsecase.DeletePhoto(req.user!.id)
    sendResponse(res, 200, true, null, "Photo removed.")
  },
}
