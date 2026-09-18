import { Router } from "express"
import { z } from "zod"
import { env } from "../../config/env.js"
import { asyncHandler } from "../../lib/http.js"
import { ApiError, unauthorized } from "../../lib/errors.js"
import { mailConfigured, sendMail, verificationMail } from "../../lib/mail.js"
import { requireAuth } from "../../middleware/auth.js"
import { authLimiter } from "../../middleware/rateLimit.js"
import { body, validate } from "../../middleware/validate.js"
import * as service from "./service.js"
import { loginSchema, registerSchema, updateProfileSchema } from "./schema.js"

const REFRESH_COOKIE = "wru_refresh"

function setRefreshCookie(res: Parameters<Router["use"]>[0] extends never ? never : any, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    path: "/api/auth",
    expires: expiresAt,
  })
}

const verifyConfirmSchema = z.object({ token: z.string().min(16).max(200) })

export const authRouter = Router()

authRouter.post(
  "/register",
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const user = await service.register(body(req, registerSchema))
    const session = await service.issueSession(user, req.header("user-agent") ?? "", req.ip ?? "")
    setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt)
    res.status(201).json({ user: service.publicUser(user), accessToken: session.accessToken })
  }),
)

authRouter.post(
  "/login",
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const user = await service.login(body(req, loginSchema))
    const session = await service.issueSession(user, req.header("user-agent") ?? "", req.ip ?? "")
    setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt)
    res.json({ user: service.publicUser(user), accessToken: session.accessToken })
  }),
)

authRouter.post(
  "/refresh",
  authLimiter,
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE]
    if (!token) throw unauthorized("No session cookie.")
    const result = await service.refreshSession(token, req.header("user-agent") ?? "", req.ip ?? "")
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt)
    res.json({ user: service.publicUser(result.user), accessToken: result.accessToken })
  }),
)

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    await service.revokeSession(req.cookies?.[REFRESH_COOKIE])
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" })
    res.status(204).end()
  }),
)

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: service.publicUser(await service.getUser(req.user!.id)) })
  }),
)

authRouter.patch(
  "/me",
  requireAuth,
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    const user = await service.updateProfile(req.user!.id, body(req, updateProfileSchema))
    res.json({ user: service.publicUser(user) })
  }),
)

authRouter.post(
  "/logout-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    await service.revokeAllSessions(req.user!.id)
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" })
    res.status(204).end()
  }),
)

/**
 * Ask for a verification link.
 *
 * With a transport configured the token is mailed and never returned - handing
 * it back over HTTP would make the whole gate decorative, since anyone holding
 * a session could verify an address they do not control.
 *
 * With `MAIL_TRANSPORT=none` the token comes back in the response so the flow
 * can be followed in development, and `deliveredBy` says exactly that. That
 * state cannot reach production: `config/env.ts` refuses to start without a
 * transport, and this route refuses to answer as a second line of defence,
 * because a config file is easier to get wrong than two checks are.
 */
authRouter.post(
  "/verify/request",
  authLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    if (env.NODE_ENV === "production" && !mailConfigured()) {
      throw new ApiError(
        503,
        "not_configured",
        "Email verification needs a mail transport, and none is configured.",
      )
    }

    const user = await service.getUser(req.user!.id)
    const result = await service.requestEmailVerification(req.user!.id)
    if (result.alreadyVerified) return res.json({ alreadyVerified: true })

    if (!mailConfigured()) {
      return res.json({ alreadyVerified: false, token: result.token, deliveredBy: "response" })
    }

    const sent = await sendMail(verificationMail(user.email!, user.name, result.token!))
    if (!sent.sent) {
      // The token is written either way, so the only honest thing to report is
      // that it exists and did not arrive. 502, not 500: the failure is
      // downstream, and a retry is a reasonable thing for the client to offer.
      throw new ApiError(502, "mail_failed", `We could not send the email. ${sent.reason}`)
    }
    res.json({ alreadyVerified: false, deliveredBy: sent.transport })
  }),
)

authRouter.post(
  "/verify/confirm",
  authLimiter,
  validate({ body: verifyConfirmSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.confirmEmailVerification(body(req, verifyConfirmSchema).token))
  }),
)
