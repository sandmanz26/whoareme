import { Router } from "express"
import { ObjectId } from "mongodb"
import { z } from "zod"
import { asyncHandler } from "../../lib/http.js"
import { badRequest } from "../../lib/errors.js"
import { requireAuth, requireModerator } from "../../middleware/auth.js"
import { reportLimiter } from "../../middleware/rateLimit.js"
import { body, validate } from "../../middleware/validate.js"
import { viewerHash } from "../../lib/tokens.js"
import { isoDay } from "../traffic/service.js"
import { REPORT_REASONS, ROLES } from "../../types.js"
import {
  appealNotice,
  auditLog,
  decideAppeal,
  fileReport,
  markNoticeRead,
  noticesFor,
  openAppeals,
  openReports,
  readSettings,
  resolveReport,
  setUserSuspended,
  setWorkPublished,
  writeSettings,
} from "./service.js"

/** Express 5 types a route param as possibly an array; narrow before trusting it. */
function objectId(value: unknown): ObjectId {
  if (typeof value !== "string" || !ObjectId.isValid(value)) {
    throw badRequest("That id is not valid.")
  }
  return new ObjectId(value)
}

/**
 * A reason is required by the schema, not optional with a default.
 *
 * An audit log full of empty strings is the same as no audit log, and the
 * cheapest place to stop that is the edge. Twelve characters is low enough not
 * to be a hurdle and high enough to rule out "ok".
 */
const reasonSchema = z.object({
  reason: z.string().trim().min(12, "Give a reason a colleague could act on.").max(500),
})

// ── Public: filing a report ─────────────────────────────────────────────

export const reportRouter = Router()

const reportSchema = z.object({
  targetKind: z.enum(["work", "user"]),
  targetId: z.string(),
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(1000).default(""),
})

/**
 * Deliberately open to anyone, signed in or not. Requiring an account would
 * mean the only people who can report are the ones already invested, and the
 * reports worth having often come from a passer-by who noticed a claim they
 * happen to know is false.
 */
reportRouter.post(
  "/",
  reportLimiter,
  validate({ body: reportSchema }),
  asyncHandler(async (req, res) => {
    const input = body(req, reportSchema)
    await fileReport({
      targetKind: input.targetKind,
      targetId: objectId(input.targetId),
      reason: input.reason,
      note: input.note,
      reporterHash: viewerHash(req.ip ?? "0.0.0.0", req.header("user-agent") ?? "", isoDay()),
    })
    // No id comes back. A report is a request for review, and handing out a
    // reference implies a ticket the reporter can chase, which does not exist.
    res.status(202).json({ received: true })
  }),
)

// ── Public: site settings ───────────────────────────────────────────────

export const settingsRouter = Router()

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await readSettings()
    res.json({
      contact: settings.contact,
      copy: settings.copy,
      disabledRoles: settings.disabledRoles,
    })
  }),
)

// ── Moderator only ──────────────────────────────────────────────────────

export const moderationRouter = Router()

moderationRouter.use(requireAuth, requireModerator)

moderationRouter.get(
  "/reports",
  asyncHandler(async (_req, res) => {
    res.json({ items: await openReports() })
  }),
)

moderationRouter.post(
  "/reports/:id/resolve",
  validate({ body: reasonSchema }),
  asyncHandler(async (req, res) => {
    await resolveReport(objectId(req.params.id), body(req, reasonSchema).reason, req.user!)
    res.json({ ok: true })
  }),
)

moderationRouter.post(
  "/work/:id/unpublish",
  validate({ body: reasonSchema }),
  asyncHandler(async (req, res) => {
    await setWorkPublished(objectId(req.params.id), false, body(req, reasonSchema).reason, req.user!)
    res.json({ ok: true })
  }),
)

moderationRouter.post(
  "/work/:id/republish",
  validate({ body: reasonSchema }),
  asyncHandler(async (req, res) => {
    await setWorkPublished(objectId(req.params.id), true, body(req, reasonSchema).reason, req.user!)
    res.json({ ok: true })
  }),
)

moderationRouter.post(
  "/users/:id/suspend",
  validate({ body: reasonSchema }),
  asyncHandler(async (req, res) => {
    await setUserSuspended(objectId(req.params.id), true, body(req, reasonSchema).reason, req.user!)
    res.json({ ok: true })
  }),
)

moderationRouter.post(
  "/users/:id/reinstate",
  validate({ body: reasonSchema }),
  asyncHandler(async (req, res) => {
    await setUserSuspended(objectId(req.params.id), false, body(req, reasonSchema).reason, req.user!)
    res.json({ ok: true })
  }),
)

moderationRouter.get(
  "/log",
  asyncHandler(async (_req, res) => {
    res.json({ items: await auditLog() })
  }),
)

// ── Appeals, reviewed by someone other than whoever decided ─────────────

moderationRouter.get(
  "/appeals",
  asyncHandler(async (_req, res) => {
    res.json({ items: await openAppeals() })
  }),
)

const appealDecisionSchema = reasonSchema.extend({
  outcome: z.enum(["upheld", "overturned"]),
})

moderationRouter.post(
  "/appeals/:id/decide",
  validate({ body: appealDecisionSchema }),
  asyncHandler(async (req, res) => {
    const input = body(req, appealDecisionSchema)
    await decideAppeal(objectId(req.params.id), input.outcome, input.reason, req.user!)
    res.json({ ok: true })
  }),
)

const settingsPatchSchema = z
  .object({
    contact: z
      .object({
        email: z.string().email(),
        location: z.string().trim().min(1).max(120),
        responseTime: z.string().trim().max(200),
      })
      .optional(),
    copy: z.record(z.string(), z.string().max(2000)).optional(),
    disabledRoles: z.array(z.enum(ROLES)).optional(),
    reason: z.string().trim().min(12).max(500),
  })
  .refine(
    (value) => value.contact !== undefined || value.copy !== undefined || value.disabledRoles !== undefined,
    { message: "Nothing to change." },
  )

moderationRouter.put(
  "/settings",
  validate({ body: settingsPatchSchema }),
  asyncHandler(async (req, res) => {
    const { reason, ...patch } = body(req, settingsPatchSchema)
    res.json(await writeSettings(patch, reason, req.user!))
  }),
)

// ── The author's own end of a decision ──────────────────────────────────

/**
 * Separate router, mounted for any signed-in account.
 *
 * These are not moderation endpoints even though they read the same records:
 * they are how the person a decision was taken about reads the reason and
 * contests it. Gating them behind `requireModerator` would leave the reason
 * filed somewhere only the people who wrote it can see, which is the failure
 * the notice exists to prevent.
 */
export const noticeRouter = Router()

noticeRouter.use(requireAuth)

noticeRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ items: await noticesFor(req.user!.id) })
  }),
)

noticeRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await markNoticeRead(req.user!.id, objectId(req.params.id))
    res.json({ ok: true })
  }),
)

const appealSchema = z.object({
  text: z.string().trim().min(20, "Say what is wrong with the decision.").max(1500),
})

noticeRouter.post(
  "/:id/appeal",
  validate({ body: appealSchema }),
  asyncHandler(async (req, res) => {
    const notice = await appealNotice(req.user!.id, objectId(req.params.id), body(req, appealSchema).text)
    res.status(201).json({ notice })
  }),
)
