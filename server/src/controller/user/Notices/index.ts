import type { Request, Response } from "express"
import { NoticesUsecase, appealSchema } from "../../../usecase/user/Notices/index.js"
import { sendResponse } from "../../../utils/express.js"
import { badRequest } from "../../../middleware/error.js"

function parseId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/i.test(value)) {
    throw badRequest("That id is not valid.")
  }
  return value
}

export const NoticesController = {
  async GetList(req: Request, res: Response) {
    const items = await NoticesUsecase.GetList(req.user!.id)
    sendResponse(res, 200, true, { items }, "")
  },

  async MarkRead(req: Request, res: Response) {
    await NoticesUsecase.MarkRead(req.user!.id, parseId(req.params.id))
    sendResponse(res, 200, true, null, "Marked as read.")
  },

  async Appeal(req: Request, res: Response) {
    const { text } = appealSchema.parse(req.body)
    const notice = await NoticesUsecase.Appeal(req.user!.id, parseId(req.params.id), text)
    sendResponse(res, 201, true, { notice }, "Appeal submitted.")
  },
}
