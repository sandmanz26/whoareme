import { connect, disconnect } from "../db/client.js"
import { users, works } from "../db/collections.js"
import { logger } from "../lib/logger.js"
import type { TopicId } from "../types.js"

/**
 * Recomputes `users.counts` from `works` and repairs any drift.
 *
 * The counters are maintained by a guarded update inside a transaction, so
 * they should never diverge — but a crashed migration or a manual write can
 * do it, and a wrong counter silently blocks someone from publishing. Safe to
 * run against a live database.
 */
async function main() {
  await connect()

  const rows = await works()
    .aggregate<{ _id: { authorId: unknown; topic: TopicId }; n: number }>([
      { $match: { status: "published" } },
      { $unwind: "$topics" },
      { $group: { _id: { authorId: "$authorId", topic: "$topics" }, n: { $sum: 1 } } },
    ])
    .toArray()

  const totals = await works()
    .aggregate<{ _id: unknown; n: number }>([
      { $match: { status: "published" } },
      { $group: { _id: "$authorId", n: { $sum: 1 } } },
    ])
    .toArray()

  const truth = new Map<string, { publishedWorks: number; topicUsage: Record<string, number> }>()
  for (const row of totals) {
    truth.set(String(row._id), { publishedWorks: row.n, topicUsage: {} })
  }
  for (const row of rows) {
    const key = String(row._id.authorId)
    const entry = truth.get(key) ?? { publishedWorks: 0, topicUsage: {} }
    entry.topicUsage[row._id.topic] = row.n
    truth.set(key, entry)
  }

  let repaired = 0
  const cursor = users().find({}, { projection: { _id: 1, slug: 1, counts: 1 } })

  for await (const user of cursor) {
    const actual = truth.get(String(user._id)) ?? { publishedWorks: 0, topicUsage: {} }
    const stored = user.counts ?? { publishedWorks: 0, topicUsage: {} }
    const drifted =
      stored.publishedWorks !== actual.publishedWorks ||
      JSON.stringify(stored.topicUsage ?? {}) !== JSON.stringify(actual.topicUsage)

    if (!drifted) continue

    await users().updateOne({ _id: user._id }, { $set: { counts: actual, updatedAt: new Date() } })
    logger.warn({ slug: user.slug, stored, actual }, "repaired drifted counts")
    repaired += 1
  }

  logger.info({ repaired }, "reconcile complete")
  await disconnect()
}

main().catch((error) => {
  logger.fatal({ err: error }, "reconcile failed")
  process.exit(1)
})
