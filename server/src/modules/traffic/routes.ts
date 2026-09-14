import { Router } from "express"
import { z } from "zod"
import { asyncHandler } from "../../lib/http.js"
import { requireAuth } from "../../middleware/auth.js"
import { query, validate } from "../../middleware/validate.js"
import { summary } from "./service.js"

const rangeSchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
})

export const trafficRouter = Router()

/** Your own numbers only. There is no endpoint that reveals someone else's. */
trafficRouter.get(
  "/me",
  requireAuth,
  validate({ query: rangeSchema }),
  asyncHandler(async (req, res) => {
    res.json(await summary(req.user!.id, query(req, rangeSchema).days))
  }),
)
