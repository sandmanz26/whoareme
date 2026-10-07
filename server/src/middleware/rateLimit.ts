import rateLimit from "express-rate-limit"
import type { NextFunction, Request, Response } from "express"
import { env } from "../config/index.js"

const skipInTests = () => env.NODE_ENV === "test"

export const generalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => req.url === "/api/health" || skipInTests(),
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: skipInTests,
})

export const reportLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: skipInTests,
})

export const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: skipInTests,
})

export const funnelLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: skipInTests,
})

/**
 * Per-email login throttle with a progressive delay, not a lockout.
 *
 * The IP limiter alone does not slow credential stuffing: with
 * `skipSuccessfulRequests` a correct leaked password counts as a success and is
 * never counted. This tracks failures per email and adds an increasing delay
 * before the next attempt, capped at three seconds. It deliberately does not
 * lock the account, because a hard lock keyed on an email the attacker already
 * knows is a denial-of-service tool aimed at the person, not the attacker.
 */
const loginAttempts = new Map<string, { fails: number; resetAt: number }>()
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const MAX_TRACKED_EMAILS = 5000

function pruneLoginAttempts(now: number) {
  if (loginAttempts.size <= MAX_TRACKED_EMAILS) return
  for (const [key, record] of loginAttempts) if (record.resetAt <= now) loginAttempts.delete(key)
}

export const loginThrottle = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (env.NODE_ENV === "test") return next()

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : ""
  if (!email) return next()

  const now = Date.now()
  pruneLoginAttempts(now)

  const record = loginAttempts.get(email)
  if (record && record.resetAt > now && record.fails > 3) {
    const delay = Math.min(2 ** (record.fails - 3) * 100, 3000)
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  res.on("finish", () => {
    const at = Date.now()
    const current = loginAttempts.get(email)
    const active =
      current && current.resetAt > at ? current : { fails: 0, resetAt: at + LOGIN_WINDOW_MS }
    if (res.statusCode === 401) {
      active.fails += 1
      loginAttempts.set(email, active)
    } else if (res.statusCode < 400) {
      loginAttempts.delete(email)
    }
  })

  next()
}
