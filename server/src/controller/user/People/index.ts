import type { Request, Response } from "express"
import { PeopleUsecase } from "../../../usecase/user/People/index.js"
import { sendResponse } from "../../../utils/express.js"

export const PeopleController = {
  async GetList(req: Request, res: Response) {
    const data = await PeopleUsecase.GetList(req.query as Record<string, unknown>)
    sendResponse(res, 200, true, data, "")
  },

  async GetFacets(_req: Request, res: Response) {
    const data = await PeopleUsecase.GetFacets()
    res.setHeader("Cache-Control", "public, max-age=60")
    sendResponse(res, 200, true, data, "")
  },

  async GetBySlug(req: Request, res: Response) {
    const user = await PeopleUsecase.GetBySlug(String(req.params["slug"]))

    void PeopleUsecase.RecordProfileView(
      user._id.toString(),
      req.ip ?? "0.0.0.0",
      String(req.headers["user-agent"] ?? ""),
      req.user?.id,
    ).catch(() => {})

    sendResponse(res, 200, true, { user }, "")
  },
}
