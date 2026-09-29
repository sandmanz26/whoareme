import fs from "node:fs/promises"
import path from "node:path"
import Work from "../../../models/work.js"
import User from "../../../models/user.js"
import { env } from "../../../config/index.js"
import { forbidden, notFound } from "../../../middleware/error.js"

/** Converts a stored full URL back to a local file path for deletion. */
async function removeFile(storedUrl: string | null | undefined) {
  if (!storedUrl) return
  const base = env.API_BASE_URL.replace(/\/$/, "")
  if (!storedUrl.startsWith(base + "/")) return
  const rel = storedUrl.slice(base.length + 1) // e.g. "profiles/abc.jpg"
  await fs.unlink(path.join("uploads", rel)).catch(() => {})
}

export const UploadsUsecase = {
  async AddThumbnail(userId: string, workId: string, filename: string) {
    const work = await Work.findOne({ _id: workId, deletedAt: null }).lean()
    if (!work) throw notFound("Entry")
    if (work.authorId.toString() !== userId) throw forbidden("That entry belongs to someone else.")

    await removeFile(work.thumbnailPath)
    const url = `${env.API_BASE_URL}/thumbnails/${filename}`
    await Work.updateOne({ _id: workId }, { $set: { thumbnailPath: url, updatedAt: new Date() } })

    return { thumbnailPath: url }
  },

  async DeleteThumbnail(userId: string, workId: string) {
    const work = await Work.findOne({ _id: workId, deletedAt: null }).lean()
    if (!work) throw notFound("Entry")
    if (work.authorId.toString() !== userId) throw forbidden("That entry belongs to someone else.")

    await removeFile(work.thumbnailPath)
    await Work.updateOne({ _id: workId }, { $set: { thumbnailPath: null, updatedAt: new Date() } })
  },

  async AddPhoto(userId: string, filename: string) {
    const user = await User.findOne({ _id: userId, status: "active" }).lean()
    if (!user) throw notFound("Account")

    await removeFile(user.photoUrl)
    const url = `${env.API_BASE_URL}/profiles/${filename}`
    await Promise.all([
      User.updateOne({ _id: userId }, { $set: { photoUrl: url, updatedAt: new Date() } }),
      Work.updateMany({ authorId: userId }, { $set: { "author.photoUrl": url } }),
    ])

    return { photoUrl: url }
  },

  async DeletePhoto(userId: string) {
    const user = await User.findOne({ _id: userId, status: "active" }).lean()
    if (!user) throw notFound("Account")

    await removeFile(user.photoUrl)
    await Promise.all([
      User.updateOne({ _id: userId }, { $set: { photoUrl: "", updatedAt: new Date() } }),
      Work.updateMany({ authorId: userId }, { $set: { "author.photoUrl": "" } }),
    ])
  },
}
