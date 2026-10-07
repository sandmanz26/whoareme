import Work from "../../../models/work.js"
import User from "../../../models/user.js"
import { env } from "../../../config/index.js"
import { forbidden, notFound } from "../../../middleware/error.js"
import { removeStoredFile } from "../../../utils/files.js"

export const UploadsUsecase = {
  async AddThumbnail(userId: string, workId: string, filename: string) {
    const work = await Work.findOne({ _id: workId, deletedAt: null }).lean()
    if (!work) throw notFound("Entry")
    if (work.authorId.toString() !== userId) throw forbidden("That entry belongs to someone else.")

    await removeStoredFile(work.thumbnailPath)
    const url = `${env.API_BASE_URL}/uploads/thumbnails/${filename}`
    await Work.updateOne({ _id: workId }, { $set: { thumbnailPath: url, updatedAt: new Date() } })

    return { thumbnailPath: url }
  },

  async DeleteThumbnail(userId: string, workId: string) {
    const work = await Work.findOne({ _id: workId, deletedAt: null }).lean()
    if (!work) throw notFound("Entry")
    if (work.authorId.toString() !== userId) throw forbidden("That entry belongs to someone else.")

    await removeStoredFile(work.thumbnailPath)
    await Work.updateOne({ _id: workId }, { $set: { thumbnailPath: null, updatedAt: new Date() } })
  },

  async AddPhoto(userId: string, filename: string) {
    const user = await User.findOne({ _id: userId, status: "active" }).lean()
    if (!user) throw notFound("Account")

    await removeStoredFile(user.photoUrl)
    const url = `${env.API_BASE_URL}/uploads/profiles/${filename}`
    await Promise.all([
      User.updateOne({ _id: userId }, { $set: { photoUrl: url, updatedAt: new Date() } }),
      Work.updateMany({ authorId: userId }, { $set: { "author.photoUrl": url } }),
    ])

    return { photoUrl: url }
  },

  async DeletePhoto(userId: string) {
    const user = await User.findOne({ _id: userId, status: "active" }).lean()
    if (!user) throw notFound("Account")

    await removeStoredFile(user.photoUrl)
    await Promise.all([
      User.updateOne({ _id: userId }, { $set: { photoUrl: "", updatedAt: new Date() } }),
      Work.updateMany({ authorId: userId }, { $set: { "author.photoUrl": "" } }),
    ])
  },
}
