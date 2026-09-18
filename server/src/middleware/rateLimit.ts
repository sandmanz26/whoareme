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

/**
 * Reporting is open to anyone, signed in or not, which makes it the cheapest
 * thing on the API to abuse.
 *
 * Tighter than `writeLimiter` because the cost of a flood is not server load,
 * it is a moderation queue nobody can read - and a queue nobody reads is the
 * same as no moderation. The unique index on `reports` already collapses the
 * same person filing the same complaint twice; this stops a script filing one
 * about every entry in the directory.
 *
 * Successful reports are counted. `skipSuccessfulRequests` would defeat the
 * point here, because the successes are the flood.
 */
export const reportLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60_000,
  limit: 10,
  message: {
    error: {
      code: "rate_limited",
      message: "That is a lot of reports in an hour. Give the moderators a chance to read them.",
    },
  },
})
