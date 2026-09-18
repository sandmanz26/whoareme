import { Router } from "express"
import multer from "multer"
import { GridFSBucket, ObjectId } from "mongodb"
import { getDb } from "../../db/client.js"
import { THUMBNAIL_BUCKET } from "../../db/collections.js"
import { users, works } from "../../db/collections.js"
import { env } from "../../config/env.js"
import { badRequest, forbidden, notFound } from "../../lib/errors.js"
import { asyncHandler } from "../../lib/http.js"
import { requireAuth } from "../../middleware/auth.js"
import { writeLimiter } from "../../middleware/rateLimit.js"
import { idParamSchema } from "../work/schema.js"
import { params, validate } from "../../middleware/validate.js"

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_THUMBNAIL_BYTES, files: 1 },
  fileFilter: (_req, file, done) => {
    if (!ALLOWED.has(file.mimetype)) {
      done(badRequest("Thumbnails must be JPEG, PNG or WebP."))
      return
    }
    done(null, true)
  },
})

function bucket() {
  return new GridFSBucket(getDb(), { bucketName: THUMBNAIL_BUCKET })
}

export const uploadRouter = Router()

/**
 * GridFS rather than S3 so the API has one dependency instead of two. The
 * client already downscales to 960px before upload; the size limit here is the
 * backstop. Swap `bucket()` for an S3 client and a CDN URL when image traffic
 * justifies it — nothing else in the codebase needs to change.
 */
uploadRouter.post(
  "/work/:id/thumbnail",
  requireAuth,
  writeLimiter,
  validate({ params: idParamSchema }),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("No file uploaded. Send it as `file`.")

    const { id } = params(req, idParamSchema)
    const work = await works().findOne({ _id: new ObjectId(id) })
    if (!work) throw notFound("Entry")
    if (!work.authorId.equals(req.user!.id)) throw forbidden("That entry belongs to someone else.")

    const stream = bucket().openUploadStream(`${work.slug}-${Date.now()}`, {
      contentType: req.file.mimetype,
      metadata: { workId: work._id, ownerId: req.user!.id },
    })
    stream.end(req.file.buffer)
    await new Promise<void>((resolve, reject) => {
      stream.on("finish", () => resolve())
      stream.on("error", reject)
    })

    const previous = work.thumbnailId
    await works().updateOne(
      { _id: work._id },
      { $set: { thumbnailId: stream.id, updatedAt: new Date() } },
    )
    if (previous) await bucket().delete(previous).catch(() => {})

    res.status(201).json({ thumbnailId: stream.id, url: `/api/uploads/thumbnails/${stream.id}` })
  }),
)

uploadRouter.delete(
  "/work/:id/thumbnail",
  requireAuth,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = params(req, idParamSchema)
    const work = await works().findOne({ _id: new ObjectId(id) })
    if (!work) throw notFound("Entry")
    if (!work.authorId.equals(req.user!.id)) throw forbidden("That entry belongs to someone else.")

    if (work.thumbnailId) {
      await bucket().delete(work.thumbnailId).catch(() => {})
      await works().updateOne({ _id: work._id }, { $set: { thumbnailId: null, updatedAt: new Date() } })
    }
    res.status(204).end()
  }),
)

uploadRouter.get(
  "/thumbnails/:id",
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = params(req, idParamSchema)
    const fileId = new ObjectId(id)

    const [file] = await bucket().find({ _id: fileId }).limit(1).toArray()
    if (!file) throw notFound("Image")

    // Content is immutable — the id changes when the image does.
    res.setHeader("Content-Type", file.contentType ?? "application/octet-stream")
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
    bucket().openDownloadStream(fileId).pipe(res)
  }),
)

/**
 * The profile photo.
 *
 * Same bucket and same limits as a thumbnail, because it is the same problem:
 * an image the author owns, replaced in place, with the old one deleted so a
 * mailbox of orphaned blobs does not accumulate.
 *
 * The write fans out to `works.author.photoUrl` for the same reason the rest
 * of the author snapshot does - every card reads the snapshot, so a photo that
 * changed only on the profile would leave the old face on all of that
 * person's entries until something else touched them.
 */
uploadRouter.post(
  "/profile/photo",
  requireAuth,
  writeLimiter,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("No file uploaded. Send it as `file`.")

    const user = await users().findOne({ _id: req.user!.id })
    if (!user) throw notFound("Account")

    const stream = bucket().openUploadStream(`${user.slug}-avatar-${Date.now()}`, {
      contentType: req.file.mimetype,
      metadata: { ownerId: user._id, kind: "avatar" },
    })
    stream.end(req.file.buffer)
    await new Promise<void>((resolve, reject) => {
      stream.on("finish", () => resolve())
      stream.on("error", reject)
    })

    const url = `/api/uploads/thumbnails/${stream.id.toHexString()}`
    await users().updateOne({ _id: user._id }, { $set: { photoUrl: url, updatedAt: new Date() } })
    await works().updateMany({ authorId: user._id }, { $set: { "author.photoUrl": url } })

    // Only a photo this route stored is ours to delete. One typed in by hand,
    // or seeded, is somebody else's URL.
    const previous = user.photoUrl?.match(/^\/api\/uploads\/thumbnails\/([a-f0-9]{24})$/i)?.[1]
    if (previous) await bucket().delete(new ObjectId(previous)).catch(() => {})

    res.status(201).json({ photoUrl: url })
  }),
)

uploadRouter.delete(
  "/profile/photo",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await users().findOne({ _id: req.user!.id })
    if (!user) throw notFound("Account")

    const stored = user.photoUrl?.match(/^\/api\/uploads\/thumbnails\/([a-f0-9]{24})$/i)?.[1]
    if (stored) await bucket().delete(new ObjectId(stored)).catch(() => {})

    await users().updateOne({ _id: user._id }, { $set: { photoUrl: "", updatedAt: new Date() } })
    await works().updateMany({ authorId: user._id }, { $set: { "author.photoUrl": "" } })
    res.status(204).end()
  }),
)
