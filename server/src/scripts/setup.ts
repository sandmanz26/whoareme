import mongoose from "mongoose"
import { env } from "../config/index.js"

async function main() {
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB })
  console.log("Connected to", env.MONGODB_DB)

  // Import all models so Mongoose registers the schemas and syncs indexes
  await import("../models/user.js")
  await import("../models/work.js")
  await import("../models/trafficEvent.js")
  await import("../models/trafficDaily.js")
  await import("../models/report.js")
  await import("../models/moderationAction.js")
  await import("../models/notice.js")
  await import("../models/siteSettings.js")
  await import("../models/funnelDay.js")

  await mongoose.syncIndexes()
  console.log("Indexes synced")

  await mongoose.disconnect()
  console.log("Done")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
