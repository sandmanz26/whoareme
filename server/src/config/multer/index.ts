import multer from "multer"
import { randomBytes } from "node:crypto"
import path from "node:path"
import fs from "node:fs"
import { env } from "../index.js"

function makeStorage(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      cb(null, `${randomBytes(16).toString("hex")}${ext}`)
    },
  })
}

function fileFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
  if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Only JPEG, PNG and WebP images are allowed."))
  }
}

export const uploadThumbnail = multer({
  storage: makeStorage("uploads/thumbnails"),
  limits: { fileSize: env.MAX_THUMBNAIL_BYTES },
  fileFilter,
})

export const uploadPhoto = multer({
  storage: makeStorage("uploads/profiles"),
  limits: { fileSize: env.MAX_THUMBNAIL_BYTES },
  fileFilter,
})
