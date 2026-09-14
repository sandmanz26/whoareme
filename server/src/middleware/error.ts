import type { NextFunction, Request, Response } from "express"
import { MongoServerError } from "mongodb"
import { ZodError } from "zod"
import { ApiError } from "../lib/errors.js"
import { logger } from "../lib/logger.js"
import { env } from "../config/env.js"

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: "not_found", message: `No route for ${req.method} ${req.path}` } })
}

/**
 * One place that decides what a client is told. Anything unrecognised becomes
 * a 500 with an opaque message — internal errors must never leak a stack, a
 * driver message or a field name a caller was not meant to know about.
 */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    })
    return
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "validation_failed",
        message: "Some fields need attention.",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    })
    return
  }

  if (error instanceof MongoServerError) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern ?? {})[0] ?? "value"
      res.status(409).json({
        error: { code: "duplicate", message: `That ${field} is already taken.`, details: { field } },
      })
      return
    }
    if (error.code === 121) {
      // Schema validation rejected the document — a bug in our own mapping,
      // not something the caller can fix, so log loudly and stay vague.
      logger.error({ err: error, path: req.path }, "document failed schema validation")
      res.status(500).json({ error: { code: "internal", message: "Could not save that." } })
      return
    }
  }

  logger.error({ err: error, path: req.path, method: req.method }, "unhandled error")
  res.status(500).json({
    error: {
      code: "internal",
      message: "Something went wrong on our side.",
      ...(env.NODE_ENV === "development" && error instanceof Error ? { details: error.message } : {}),
    },
  })
}
