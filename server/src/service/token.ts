import jwt from "jsonwebtoken"
import { env } from "../config/index.js"
import type { AccessLevel, RoleId } from "../constant/app.js"

export interface TokenPayload {
  sub: string
  slug: string
  role: RoleId
  access: AccessLevel
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions)
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload
}
