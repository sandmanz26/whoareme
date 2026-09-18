import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import helmet from "helmet"
import { pinoHttp } from "pino-http"
import { env } from "./config/env.js"
import { logger } from "./lib/logger.js"
import { errorHandler, notFoundHandler } from "./middleware/error.js"
import { generalLimiter } from "./middleware/rateLimit.js"
import { authRouter } from "./modules/auth/routes.js"
import { userRouter } from "./modules/users/routes.js"
import { authorWorkRouter, workRouter } from "./modules/work/routes.js"
import { trafficRouter } from "./modules/traffic/routes.js"
import { uploadRouter } from "./modules/uploads/routes.js"
import {
  moderationRouter,
  noticeRouter,
  reportRouter,
  settingsRouter,
} from "./modules/moderation/routes.js"
import { analyticsRouter } from "./modules/analytics/routes.js"
import { taxonomyRouter } from "./modules/taxonomy/routes.js"

export function createApp() {
  const app = express()

  // Behind a load balancer or Cloudflare, req.ip must come from the proxy
  // header or every visitor shares one rate-limit bucket.
  app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false)
  app.disable("x-powered-by")

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))
  app.use(
    cors({
      origin(origin, done) {
        // Same-origin and server-to-server requests send no Origin header.
        if (!origin || env.CORS_ORIGINS.includes(origin)) return done(null, true)
        done(new Error(`Origin ${origin} is not allowed.`))
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: "256kb" }))
  app.use(cookieParser())
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req: { url?: string }) => req.url === "/api/health" } }))
  app.use(generalLimiter)

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, env: env.NODE_ENV, uptime: Math.round(process.uptime()) })
  })

  app.use("/api/auth", authRouter)
  app.use("/api/people", userRouter)
  app.use("/api/people", authorWorkRouter)
  app.use("/api/work", workRouter)
  app.use("/api/traffic", trafficRouter)
  app.use("/api/uploads", uploadRouter)
  // Public: anyone may file a report, read the site settings, read the
  // taxonomy, or contribute a funnel counter.
  app.use("/api/reports", reportRouter)
  app.use("/api/settings", settingsRouter)
  app.use("/api/taxonomy", taxonomyRouter)
  app.use("/api/analytics", analyticsRouter)
  // Signed in: the author's own end of a moderation decision.
  app.use("/api/notices", noticeRouter)
  // Gated: requireAuth + requireModerator, applied inside the router.
  app.use("/api/moderation", moderationRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
