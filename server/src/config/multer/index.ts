import multer from "multer"
import { randomBytes } from "node:crypto"
import fs from "node:fs"
import { env } from "../index.js"

/**
 * The stored extension comes from an allowlist keyed by MIME, never from the
 * client's filename. A filename is attacker-controlled, and a file saved as
 * `.html` and served from the API origin is a stored-XSS primitive.
 */
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
}

function makeStorage(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      cb(null, `${randomBytes(16).toString("hex")}${EXT_BY_MIME[file.mimetype] ?? ".bin"}`)
    },
  })
}

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
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
