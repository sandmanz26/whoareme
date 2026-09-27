import fs from "node:fs/promises"
import path from "node:path"
import Work from "../../../models/work.js"
import User from "../../../models/user.js"
import { forbidden, notFound } from "../../../middleware/error.js"

function isOurFile(filename: string | null): boolean {
  return Boolean(filename && !filename.startsWith("http"))
}

async function removeFile(filename: string | null) {
  if (!isOurFile(filename)) return
  await fs.unlink(path.join("uploads", filename!)).catch(() => {})
}

export const UploadsUsecase = {
  async AddThumbnail(userId: string, workId: string, filename: string) {
    const work = await Work.findOne({ _id: workId, deletedAt: null }).lean()
    if (!work) throw notFound("Entry")
    if (work.authorId.toString() !== userId) throw forbidden("That entry belongs to someone else.")

    await removeFile(work.thumbnailPath)
    await Work.updateOne({ _id: workId }, { $set: { thumbnailPath: filename, updatedAt: new Date() } })

    return { thumbnailPath: filename, url: `/${filename}` }
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

    await removeFile(user.photoUrl && !user.photoUrl.startsWith("http") ? user.photoUrl.replace(/^\//, "") : null)

    const url = `/${filename}`
    await Promise.all([
      User.updateOne({ _id: userId }, { $set: { photoUrl: url, updatedAt: new Date() } }),
      Work.updateMany({ authorId: userId }, { $set: { "author.photoUrl": url } }),
    ])

    return { photoUrl: url }
  },

  async DeletePhoto(userId: string) {
    const user = await User.findOne({ _id: userId, status: "active" }).lean()
    if (!user) throw notFound("Account")

    if (user.photoUrl && !user.photoUrl.startsWith("http")) {
      await removeFile(user.photoUrl.replace(/^\//, ""))
    }

    await Promise.all([
      User.updateOne({ _id: userId }, { $set: { photoUrl: "", updatedAt: new Date() } }),
      Work.updateMany({ authorId: userId }, { $set: { "author.photoUrl": "" } }),
    ])
  },
}
