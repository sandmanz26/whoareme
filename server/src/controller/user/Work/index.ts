import type { Request, Response } from "express"
import { WorkUsecase, workInputSchema } from "../../../usecase/user/Work/index.js"
import { sendResponse } from "../../../utils/express.js"

export const WorkController = {
  async GetList(req: Request, res: Response) {
    const data = await WorkUsecase.GetList(req.query as Record<string, unknown>)
    sendResponse(res, 200, true, data, "")
  },

  async GetBySlug(req: Request, res: Response) {
    const slug = String(req.params["slug"])
    const data = await WorkUsecase.GetBySlug(slug)

    void WorkUsecase.RecordOpen(
      { _id: (data.work as any)._id, authorId: (data.work as any).authorId },
      req.ip ?? "0.0.0.0",
      String(req.headers["user-agent"] ?? ""),
      req.user?.id,
    ).catch(() => {})

    sendResponse(res, 200, true, data, "")
  },

  async GetMineList(req: Request, res: Response) {
    const items = await WorkUsecase.GetMineList(req.user!.id)
    sendResponse(res, 200, true, { items }, "")
  },

  async GetMineById(req: Request, res: Response) {
    const work = await WorkUsecase.GetMineById(req.user!.id, String(req.params["id"]))
    sendResponse(res, 200, true, { work }, "")
  },

  async Add(req: Request, res: Response) {
    const input = workInputSchema.parse(req.body)
    const work = await WorkUsecase.Add(req.user!.id, input)
    sendResponse(res, 201, true, { work }, "Entry created.")
  },

  async Update(req: Request, res: Response) {
    const input = workInputSchema.parse(req.body)
    const work = await WorkUsecase.Update(req.user!.id, String(req.params["id"]), input)
    sendResponse(res, 200, true, { work }, "Entry updated.")
  },

  async Publish(req: Request, res: Response) {
    const work = await WorkUsecase.Publish(req.user!.id, String(req.params["id"]))
    sendResponse(res, 200, true, { work }, "Entry published.")
  },

  async Unpublish(req: Request, res: Response) {
    const work = await WorkUsecase.Unpublish(req.user!.id, String(req.params["id"]))
    sendResponse(res, 200, true, { work }, "Entry unpublished.")
  },

  async Delete(req: Request, res: Response) {
    await WorkUsecase.Delete(req.user!.id, String(req.params["id"]))
    sendResponse(res, 200, true, null, "Entry deleted.")
  },

  async GetByAuthor(req: Request, res: Response) {
    const data = await WorkUsecase.GetByAuthorSlug(
      String(req.params["slug"]),
      req.query as Record<string, unknown>,
    )
    sendResponse(res, 200, true, data, "")
  },
}
