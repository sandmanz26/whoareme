import { Router } from "express"
import { asyncHandler } from "../../lib/http.js"
import { LANGUAGES } from "../../lib/languages.js"
import {
  BUSINESS_MODELS,
  EXPERIENCE_BANDS,
  ROLES,
  ROLE_STATUS,
  TOPICS,
  TOPIC_KIND,
  TOPIC_QUOTA,
} from "../../types.js"

/**
 * Every enumerated value a client needs, in one cacheable read.
 *
 * The SPA carries its own copy of this taxonomy so it can run with no API at
 * all, which is rule 2 and is not changing. This endpoint is how the two are
 * checked against each other rather than left to drift: the same ids, the same
 * launch status, the same topic kinds, the same quota. A client that finds a
 * disagreement here has found a real bug - most likely a fixture export that
 * was never run.
 */
export const taxonomyRouter = Router()

taxonomyRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    // Values change with a deploy, never with a request.
    res.setHeader("Cache-Control", "public, max-age=300")
    res.json({
      roles: ROLES.map((id) => ({ id, status: ROLE_STATUS[id] })),
      topics: TOPICS.map((id) => ({ id, kind: TOPIC_KIND[id] })),
      models: BUSINESS_MODELS,
      experience: EXPERIENCE_BANDS,
      languages: LANGUAGES,
      topicQuota: TOPIC_QUOTA,
    })
  }),
)
