import type { NextFunction, Request, Response } from "express"
import { ObjectId } from "mongodb"
import { unauthorized } from "../lib/errors.js"
import { verifyAccessToken } from "../lib/tokens.js"

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: ObjectId; slug: string; role: string }
  }
}

function readToken(req: Request): string | null {
  const header = req.header("authorization")
  if (header?.startsWith("Bearer ")) return header.slice(7).trim()
  return null
}

/** Populates `req.user` when a valid token is present; never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req)
  if (!token) return next()
  try {
    const claims = verifyAccessToken(token)
    req.user = { id: new ObjectId(claims.sub), slug: claims.slug, role: claims.role }
  } catch {
    // An expired token on a public route is not an error — the client will
    // refresh on its next authenticated call.
  }
  next()
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req)
  if (!token) return next(unauthorized())
  try {
    const claims = verifyAccessToken(token)
    req.user = { id: new ObjectId(claims.sub), slug: claims.slug, role: claims.role }
    next()
  } catch {
    next(unauthorized("Your session has expired."))
  }
}
