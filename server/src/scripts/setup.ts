import { connect, disconnect } from "../db/client.js"
import { ensureIndexes } from "../db/indexes.js"
import { applyValidators } from "../db/schema.js"
import { logger } from "../lib/logger.js"

/** Idempotent: safe to run against an existing database. */
async function main() {
  await connect()
  await applyValidators()
  await ensureIndexes()
  logger.info("setup complete")
  await disconnect()
}

main().catch((error) => {
  logger.fatal({ err: error }, "setup failed")
  process.exit(1)
})
