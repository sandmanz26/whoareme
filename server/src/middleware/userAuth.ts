import type { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import { env } from "../config/index.js"
import type { AccessLevel, RoleId } from "../constant/app.js"
import User from "../models/user.js"

export interface AuthUser {
  id: string
  slug: string
  role: RoleId
  access: AccessLevel
  /** Present when the account is suspended. Only notice and delete routes allow it. */
  suspended?: boolean
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

/** Try to authenticate but never block the request. Sets req.user when valid. */
export const isOptionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null
    if (token) {
      try {
        jwt.verify(token, env.JWT_SECRET)
      } catch {
        return next()
      }
      const user = await User.findOne({ token, status: "active" }).select("_id slug role access")
      if (user) {
        req.user = {
          id: user._id.toString(),
          slug: user.slug,
          role: user.role as RoleId,
          access: (user.access ?? "member") as AccessLevel,
        }
      }
    }
  } catch {
    /* silently skip — optional auth never fails the request */
  }
  next()
}

/**
 * Authenticate request and optionally gate by access level.
 *
 * Token is stored on the user document (1 user, 1 active token).
 * A DB lookup on every authenticated request is the deliberate tradeoff:
 * logout invalidation is immediate because clearing the token field
 * revokes access with no extra state.
 */
export const isAuth =
  (requiredAccess?: "moderator" | "admin") =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null

      if (!token) {
        res
          .status(401)
          .json({ success: false, data: null, message: "Unauthorized. Please sign in." })
        return
      }

      try {
        jwt.verify(token, env.JWT_SECRET)
      } catch {
        res.status(401).json({ success: false, data: null, message: "Session invalid or expired." })
        return
      }

      const user = await User.findOne({ token, status: "active" }).select("_id slug role access")

      if (!user) {
        res.status(401).json({ success: false, data: null, message: "Session invalid or expired." })
        return
      }

      req.user = {
        id: user._id.toString(),
        slug: user.slug,
        role: user.role as RoleId,
        access: (user.access ?? "member") as AccessLevel,
      }

      if (requiredAccess && req.user.access !== requiredAccess && req.user.access !== "admin") {
        res.status(403).json({ success: false, data: null, message: "Insufficient permissions." })
        return
      }

      next()
    } catch (err) {
      next(err)
    }
  }

/**
 * Authenticate but also accept a suspended account.
 *
 * A suspended person still needs two things: to read the notice explaining the
 * decision and appeal it, and to delete their account. Blocking those leaves the
 * appeal route unreachable for exactly the people it exists for. Used only on
 * the notice routes, logout, GET /auth/me and DELETE /auth/me; every other
 * authenticated route keeps `isAuth`, which requires an active account.
 */
export const isAuthAllowSuspended = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null

    if (!token) {
      res.status(401).json({ success: false, data: null, message: "Unauthorized. Please sign in." })
      return
    }

    try {
      jwt.verify(token, env.JWT_SECRET)
    } catch {
      res.status(401).json({ success: false, data: null, message: "Session invalid or expired." })
      return
    }

    const user = await User.findOne({ token, status: { $in: ["active", "suspended"] } }).select(
      "_id slug role access status",
    )

    if (!user) {
      res.status(401).json({ success: false, data: null, message: "Session invalid or expired." })
      return
    }

    req.user = {
      id: user._id.toString(),
      slug: user.slug,
      role: user.role as RoleId,
      access: (user.access ?? "member") as AccessLevel,
      suspended: user.status === "suspended",
    }

    next()
  } catch (err) {
    next(err)
  }
}
