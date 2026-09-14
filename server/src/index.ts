import { createApp } from "./app.js"
import { env } from "./config/env.js"
import { connect, disconnect, supportsTransactions } from "./db/client.js"
import { ensureIndexes } from "./db/indexes.js"
import { applyValidators } from "./db/schema.js"
import { logger } from "./lib/logger.js"

async function main() {
  await connect()
  await applyValidators()
  await ensureIndexes()

  if (!(await supportsTransactions())) {
    logger.warn(
      "MongoDB is not a replica set. Publish will use compensating writes instead of a " +
        "transaction. Run `docker compose up -d` or point MONGODB_URI at Atlas.",
    )
  }

  const server = createApp().listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "api listening")
  })

  const shutdown = (signal: string) => {
    logger.info({ signal }, "shutting down")
    // Stop accepting connections, let in-flight requests finish, then close
    // the driver so no write is cut off mid-flight.
    server.close(async () => {
      await disconnect()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"))
  process.on("SIGINT", () => shutdown("SIGINT"))
}

main().catch((error) => {
  logger.fatal({ err: error }, "failed to start")
  process.exit(1)
})
