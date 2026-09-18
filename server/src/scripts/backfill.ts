import { connect, disconnect } from "../db/client.js"
import { users, works } from "../db/collections.js"
import { languagesFor } from "../lib/languages.js"
import { logger } from "../lib/logger.js"

/**
 * Backfill for a database seeded before `languages` existed.
 *
 * Two fields were added after the filter bar grew an experience and a language
 * axis: `users.languages`, and `author.years` / `author.languages` on every
 * entry. A document written before them is not invalid - the validator runs at
 * `validationLevel: "moderate"` - it is simply invisible to those two filters,
 * which is the worst kind of wrong: nothing errors, results are quietly
 * missing, and nobody can tell from the outside.
 *
 * Idempotent, and safe against a live database: it only touches documents that
 * are actually missing the field.
 *
 *   npm run db:backfill
 */
async function main() {
  await connect()

  let peopleFixed = 0
  const missingLanguages = users().find(
    { $or: [{ languages: { $exists: false } }, { languages: { $size: 0 } }] },
    { projection: { _id: 1, slug: 1, location: 1 } },
  )
  for await (const user of missingLanguages) {
    await users().updateOne(
      { _id: user._id },
      { $set: { languages: languagesFor(user.location ?? ""), updatedAt: new Date() } },
    )
    peopleFixed += 1
  }

  // Re-snapshot from the author rather than guessing, so an entry whose author
  // has since edited their profile lands on the current values.
  let worksFixed = 0
  const stale = works().find(
    { $or: [{ "author.years": { $exists: false } }, { "author.languages": { $exists: false } }] },
    { projection: { _id: 1, authorId: 1 } },
  )
  for await (const work of stale) {
    const author = await users().findOne(
      { _id: work.authorId },
      { projection: { years: 1, languages: 1 } },
    )
    if (!author) continue
    await works().updateOne(
      { _id: work._id },
      { $set: { "author.years": author.years ?? 0, "author.languages": author.languages ?? [] } },
    )
    worksFixed += 1
  }

  logger.info({ peopleFixed, worksFixed }, "backfill complete")
  await disconnect()
}

main().catch((error) => {
  logger.fatal({ err: error }, "backfill failed")
  process.exit(1)
})
