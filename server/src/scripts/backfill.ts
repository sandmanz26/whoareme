import mongoose from "mongoose"
import { env } from "../config/index.js"
import User from "../models/user.js"
import Work from "../models/work.js"
import { languagesFor } from "../utils/languages.js"

async function main() {
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB })
  console.log("Connected to", env.MONGODB_DB)

  const now = new Date()

  // Fill missing languages on users
  const usersWithoutLanguages = await User.find({
    $or: [{ languages: { $exists: false } }, { languages: { $size: 0 } }],
    location: { $nin: ["", null] },
    deletedAt: null,
  })
    .select("_id location")
    .lean()

  let usersFixed = 0
  for (const u of usersWithoutLanguages) {
    const languages = languagesFor((u as { location: string }).location)
    await User.updateOne({ _id: u._id }, { $set: { languages, updatedAt: now } })
    usersFixed++
  }
  console.log(`Backfilled languages on ${usersFixed} users`)

  // Fill missing author.years and author.languages on works
  const worksToFix = await Work.find({
    $or: [
      { "author.years": { $exists: false } },
      { "author.languages": { $exists: false } },
      { "author.languages": { $size: 0 } },
    ],
    deletedAt: null,
  })
    .select("_id authorId")
    .lean()

  const authorIds = [
    ...new Set(
      worksToFix.map((w) => (w as { authorId: mongoose.Types.ObjectId }).authorId.toString()),
    ),
  ]
  const authors = await User.find({ _id: { $in: authorIds } })
    .select("_id years languages")
    .lean()
  const authorMap = new Map(
    (authors as { _id: mongoose.Types.ObjectId; years: number; languages: string[] }[]).map((a) => [
      a._id.toString(),
      { years: a.years, languages: a.languages ?? [] },
    ]),
  )

  let worksFixed = 0
  for (const w of worksToFix) {
    const authorId = (w as { authorId: mongoose.Types.ObjectId }).authorId.toString()
    const author = authorMap.get(authorId)
    if (!author) continue

    await Work.updateOne(
      { _id: w._id },
      {
        $set: {
          "author.years": author.years,
          "author.languages": author.languages,
          updatedAt: now,
        },
      },
    )
    worksFixed++
  }
  console.log(`Backfilled author snapshot on ${worksFixed} works`)

  await mongoose.disconnect()
  console.log("Done")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
