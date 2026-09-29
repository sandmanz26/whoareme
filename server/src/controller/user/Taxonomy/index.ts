import type { Request, Response } from "express"
import { TaxonomyUsecase } from "../../../usecase/user/Taxonomy/index.js"
import { sendResponse } from "../../../utils/express.js"

export const TaxonomyController = {
  async Get(_req: Request, res: Response) {
    const data = await TaxonomyUsecase.Get()
    res.setHeader("Cache-Control", "public, max-age=300")
    sendResponse(res, 200, true, data, "")
  },
}
