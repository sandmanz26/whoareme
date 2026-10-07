import mongoose from "mongoose"
import { env } from "../config/index.js"
import User from "../models/user.js"
import Work from "../models/work.js"

/**
 * Rewrites stored upload URLs from the old root shape to /uploads/*.
 *
 * Before this change a thumbnail was stored as `${API_BASE_URL}/thumbnails/x`
 * and a portrait as `${API_BASE_URL}/profiles/x`. They now live under
 * `${API_BASE_URL}/uploads/...`. The server still redirects the old paths, so
 * this migration is not required for existing images to load; it keeps the
 * stored data consistent with the new scheme and lets the redirects be dropped
 * later. Safe to run more than once: a URL already under /uploads is left alone.
 *
 *   npm run db:migrate-uploads
 */
const base = env.API_BASE_URL.replace(/\/$/, "")

function toNew(url: string | null | undefined): string | null | undefined {
  if (!url) return url
  if (url.startsWith(`${base}/uploads/`)) return url
  if (url.startsWith(`${base}/`)) return `${base}/uploads/${url.slice(base.length + 1)}`
  return url
}

async function main() {
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB })
  console.log("Connected to", env.MONGODB_DB)

  let users = 0
  const userRows = await User.find({ photoUrl: { $nin: ["", null] } })
    .select("_id photoUrl")
    .lean()
  for (const u of userRows) {
    const next = toNew(u.photoUrl)
    if (next !== u.photoUrl) {
      await User.updateOne({ _id: u._id }, { $set: { photoUrl: next, updatedAt: new Date() } })
      users++
    }
  }

  let works = 0
  const workRows = await Work.find({}).select("_id thumbnailPath author.photoUrl").lean()
  for (const w of workRows) {
    const nextThumb = toNew(w.thumbnailPath)
    const nextPhoto = toNew(w.author?.photoUrl)
    const set: Record<string, unknown> = {}
    if (nextThumb !== w.thumbnailPath) set["thumbnailPath"] = nextThumb
    if (nextPhoto !== w.author?.photoUrl) set["author.photoUrl"] = nextPhoto
    if (Object.keys(set).length > 0) {
      set["updatedAt"] = new Date()
      await Work.updateOne({ _id: w._id }, { $set: set })
      works++
    }
  }

  console.log(`Migrated ${users} users and ${works} works.`)
  await mongoose.disconnect()
  console.log("Done")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
