import { createHash, randomBytes } from "node:crypto"
import jwt from "jsonwebtoken"
import { env } from "../config/env.js"

export interface AccessClaims {
  sub: string
  slug: string
  /** The person's craft. Carries no permission meaning. */
  role: string
  /** Access level. Absent on tokens issued before moderation existed, which
   *  is why it is optional and treated as "member" when missing. */
  access?: string
}

export function signAccessToken(claims: AccessClaims): string {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
    issuer: "whoareyou",
  })
}

export function verifyAccessToken(token: string): AccessClaims {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: "whoareyou" }) as AccessClaims
}

/**
 * Refresh tokens are opaque random strings, not JWTs — they must be
 * revocable, and only their SHA-256 is stored, so a database leak does not
 * hand over live sessions.
 */
export function createRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(48).toString("base64url")
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  return { token, tokenHash: hashToken(token), expiresAt }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * A per-day, salted hash of IP + user agent. De-duplicates repeat views
 * without storing anything that identifies a visitor, and it rotates daily so
 * it cannot be joined across days.
 */
export function viewerHash(ip: string, userAgent: string, day: string): string {
  return createHash("sha256")
    .update(`${env.VIEWER_HASH_SALT}:${day}:${ip}:${userAgent}`)
    .digest("hex")
    .slice(0, 32)
}
