import rateLimit, { type Options } from "express-rate-limit"
import { env } from "../config/env.js"

/**
 * `limit: 0` does NOT disable rate limiting in express-rate-limit v7 — it
 * blocks every request. `skip` is the supported way to turn it off, and it is
 * only ever off in tests.
 */
const skipInTests = () => env.NODE_ENV === "test"

const shared: Partial<Options> = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: skipInTests,
}

/** Generous — this protects against scripted abuse, not against browsing. */
export const generalLimiter = rateLimit({
  ...shared,
  windowMs: 60_000,
  limit: 300,
  message: { error: { code: "rate_limited", message: "Too many requests. Slow down." } },
})

/** Tight — credential stuffing and signup spam both land here. */
export const authLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60_000,
  limit: 20,
  skipSuccessfulRequests: true,
  message: { error: { code: "rate_limited", message: "Too many attempts. Try again shortly." } },
})

export const writeLimiter = rateLimit({
  ...shared,
  windowMs: 60_000,
  limit: 60,
  message: { error: { code: "rate_limited", message: "Too many writes. Slow down." } },
})
