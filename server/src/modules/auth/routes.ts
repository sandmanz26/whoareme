import { Router } from "express"
import { env } from "../../config/env.js"
import { asyncHandler } from "../../lib/http.js"
import { unauthorized } from "../../lib/errors.js"
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
