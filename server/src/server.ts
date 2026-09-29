import express from "express"
import cors from "cors"
import helmet from "helmet"
import { pinoHttp } from "pino-http"
import { env } from "./config/index.js"
import { logger } from "./libraries/logger.js"
import { connectDB, disconnectDB } from "./db/mongo.js"
import { errorHandler } from "./middleware/error.js"
import { generalLimiter } from "./middleware/rateLimit.js"
import AppRouter from "./routes/index.js"

const app = express()

app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false)
app.disable("x-powered-by")

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))
app.use(
  cors({
    origin(origin, done) {
      if (!origin || env.CORS_ORIGINS.includes(origin)) return done(null, true)
      done(new Error(`Origin ${origin} is not allowed.`))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: "256kb" }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static("uploads"))
app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === "/api/health" },
  }),
)
app.use(generalLimiter)

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, env: env.NODE_ENV, uptime: Math.round(process.uptime()) })
})

app.use("/api", AppRouter)

app.use((_req, res) => {
  res.status(404).json({ success: false, data: null, message: "Route not found." })
})

app.use(errorHandler)

const main = async () => {
  await connectDB()

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "api listening")
  })

  const shutdown = (signal: string) => {
    logger.info({ signal }, "shutting down")
    server.close(async () => {
      await disconnectDB()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"))
  process.on("SIGINT",  () => shutdown("SIGINT"))
}

main().catch((err) => {
  logger.fatal({ err }, "failed to start")
  process.exit(1)
})
