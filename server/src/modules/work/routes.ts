import { Router } from "express"
import { ObjectId } from "mongodb"
import { asyncHandler } from "../../lib/http.js"
import { tokenize } from "../../lib/text.js"
import { paginationSchema } from "../../lib/pagination.js"
import { optionalAuth, requireAuth } from "../../middleware/auth.js"
import { writeLimiter } from "../../middleware/rateLimit.js"
import { body, params, query, validate } from "../../middleware/validate.js"
import { getUser } from "../auth/service.js"
import { recordWorkOpen } from "../traffic/service.js"
import * as service from "./service.js"
import {
  idParamSchema,
  listWorkQuerySchema,
  slugParamSchema,
  workInputSchema,
} from "./schema.js"

export const workRouter = Router()

/* ── Public ──────────────────────────────────────────────────────── */

workRouter.get(
  "/",
  validate({ query: listWorkQuerySchema }),
  asyncHandler(async (req, res) => {
    const q = query(req, listWorkQuerySchema)
    const result = await service.listWork(
      { role: q.role, topic: q.topic, model: q.model, skills: q.skills, tokens: tokenize(q.q) },
      q.sort,
      { page: q.page, limit: q.limit },
    )
    res.json(result)
  }),
)

workRouter.get(
  "/:slug",
  optionalAuth,
  validate({ params: slugParamSchema }),
  asyncHandler(async (req, res) => {
    const { slug } = params(req, slugParamSchema)
    const detail = await service.getDetail(slug)

    // Fire-and-forget: an analytics write must never fail the page.
    void recordWorkOpen(detail.work, req).catch(() => {})

    res.json(detail)
  }),
)

/* ── Authenticated: the author's own entries ─────────────────────── */

workRouter.get(
  "/mine/list",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ items: await service.listMine(req.user!.id) })
  }),
)

workRouter.get(
  "/mine/:id",
  requireAuth,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = params(req, idParamSchema)
    res.json({ work: await service.getMine(req.user!.id, new ObjectId(id)) })
  }),
)

workRouter.post(
  "/",
  requireAuth,
  writeLimiter,
  validate({ body: workInputSchema }),
  asyncHandler(async (req, res) => {
    const author = await getUser(req.user!.id)
    const work = await service.createDraft(author, body(req, workInputSchema))
    res.status(201).json({ work })
  }),
)

workRouter.put(
  "/:id",
  requireAuth,
  writeLimiter,
  validate({ params: idParamSchema, body: workInputSchema }),
  asyncHandler(async (req, res) => {
    const author = await getUser(req.user!.id)
    const { id } = params(req, idParamSchema)
    res.json({ work: await service.updateDraft(author, new ObjectId(id), body(req, workInputSchema)) })
  }),
)

workRouter.post(
  "/:id/publish",
  requireAuth,
  writeLimiter,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const author = await getUser(req.user!.id)
    const { id } = params(req, idParamSchema)
    res.json({ work: await service.publish(author, new ObjectId(id)) })
  }),
)

workRouter.post(
  "/:id/unpublish",
  requireAuth,
  writeLimiter,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const author = await getUser(req.user!.id)
    const { id } = params(req, idParamSchema)
    res.json({ work: await service.unpublish(author, new ObjectId(id)) })
  }),
)

workRouter.delete(
  "/:id",
  requireAuth,
  writeLimiter,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const author = await getUser(req.user!.id)
    const { id } = params(req, idParamSchema)
    await service.remove(author, new ObjectId(id))
    res.status(204).end()
  }),
)

/* ── By author ───────────────────────────────────────────────────── */

export const authorWorkRouter = Router()

authorWorkRouter.get(
  "/:slug/work",
  validate({ params: slugParamSchema, query: paginationSchema }),
  asyncHandler(async (req, res) => {
    const { slug } = params(req, slugParamSchema)
    res.json(await service.listByAuthorSlug(slug, query(req, paginationSchema)))
  }),
)
