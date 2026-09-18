import { Router } from "express"
import { z } from "zod"
import { asyncHandler } from "../../lib/http.js"
import { requireAuth, requireModerator } from "../../middleware/auth.js"
import { body, query, validate } from "../../middleware/validate.js"
import { writeLimiter } from "../../middleware/rateLimit.js"
import { FUNNEL_STEPS } from "../../types.js"
import { readFunnel, recordSteps } from "./service.js"

export const analyticsRouter = Router()

/**
 * Accepts a batch of counters, and nothing else.
 *
 * The schema is the privacy guarantee, not a comment about one: there is no
 * field here for an id, a path, a referrer or a timestamp, so a client cannot
 * send one even by accident and the server could not store it if it did.
 *
 * Open to anyone, signed in or not - the demand side of the funnel is mostly
 * people without accounts, and counting only signed-in visitors would answer
 * a different question from the one being asked.
 */
const ingestSchema = z
  .object({
    counts: z
      .object(
        Object.fromEntries(
          FUNNEL_STEPS.map((step) => [step, z.number().int().min(1).max(1000).optional()]),
        ) as Record<(typeof FUNNEL_STEPS)[number], z.ZodOptional<z.ZodNumber>>,
      )
      .strict(),
  })
  // Strict on both levels, so an unknown key is refused rather than stripped.
  // Stripping would make this look like it accepted a field it silently threw
  // away; refusing means a client that starts sending an identifier finds out
  // immediately, which is the only moment anyone would notice.
  .strict()

analyticsRouter.post(
  "/funnel",
  writeLimiter,
  validate({ body: ingestSchema }),
  asyncHandler(async (req, res) => {
    await recordSteps(body(req, ingestSchema).counts)
    // 204 always: there is nothing to say back, and an analytics call must
    // never hand the client a reason to branch on its own success.
    res.status(204).end()
  }),
)

const windowSchema = z.object({
  days: z.coerce.number().int().min(1).max(180).default(30),
})

/**
 * Reading is moderator-only. The counters identify nobody, but they are a
 * business metric, and the sign-up completion rate is not something the site
 * owes a passer-by.
 */
analyticsRouter.get(
  "/funnel",
  requireAuth,
  requireModerator,
  validate({ query: windowSchema }),
  asyncHandler(async (req, res) => {
    res.json(await readFunnel(query(req, windowSchema).days))
  }),
)
