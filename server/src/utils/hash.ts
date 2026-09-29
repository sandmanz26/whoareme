import { createHash } from "node:crypto"
import { env } from "../config/index.js"

export function viewerHash(ip: string, userAgent: string, day: string): string {
  return createHash("sha256")
    .update(`${env.VIEWER_HASH_SALT}:${ip}:${userAgent}:${day}`)
    .digest("hex")
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}
