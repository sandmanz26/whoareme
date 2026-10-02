import mongoose from "mongoose"
import { env } from "../config/index.js"
import User from "../models/user.js"
import Work from "../models/work.js"

async function main() {
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB })
  console.log("Connected to", env.MONGODB_DB)

  const rows = await Work.aggregate([
    { $match: { status: "published" as const, deletedAt: null } },
    {
      $group: {
        _id: "$authorId",
        publishedWorks: { $sum: 1 },
        topics: { $push: "$topics" },
      },
    },
  ])

  let updated = 0
  const now = new Date()
  for (const row of rows) {
    const topicUsage: Record<string, number> = {}
    for (const arr of row.topics as string[][]) {
      for (const t of arr) topicUsage[t] = (topicUsage[t] ?? 0) + 1
    }

    await User.updateOne(
      { _id: row._id },
      {
        $set: {
          "counts.publishedWorks": row.publishedWorks,
          "counts.topicUsage": topicUsage,
          updatedAt: now,
        },
      },
    )
    updated++
  }

  // Zero out counts for authors with no published works
  const authorIds = rows.map((r) => r._id)
  const zeroed = await User.updateMany(
    { _id: { $nin: authorIds }, "counts.publishedWorks": { $gt: 0 } },
    { $set: { "counts.publishedWorks": 0, "counts.topicUsage": {}, updatedAt: now } },
  )

  console.log(`Reconciled ${updated} users, zeroed ${zeroed.modifiedCount}`)

  await mongoose.disconnect()
  console.log("Done")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
