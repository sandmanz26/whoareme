import multer from "multer"
import path from "node:path"
import { env } from "../index.js"

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/")
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, "-").toLowerCase()
    cb(null, `${Date.now()}-${name}${ext}`)
  },
})

function fileFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
  const allowed = ["image/jpeg", "image/png", "image/webp"]
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Only JPEG, PNG and WebP images are allowed."))
  }
}

export const uploadThumbnail = multer({
  storage,
  limits: { fileSize: env.MAX_THUMBNAIL_BYTES },
  fileFilter,
})

export const uploadPhoto = multer({
  storage,
  limits: { fileSize: env.MAX_THUMBNAIL_BYTES },
  fileFilter,
})
