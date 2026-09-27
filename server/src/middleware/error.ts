import type { NextFunction, Request, Response } from "express"
import { logger } from "../libraries/logger.js"
import { env } from "../config/index.js"

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }
}

export function notFound(name: string): ApiError {
  return new ApiError(404, "not_found", `${name} not found.`)
}

export function conflict(message: string, details?: unknown): ApiError {
  return new ApiError(409, "conflict", message, details)
}

export function unauthorized(message = "Unauthorized. Please sign in."): ApiError {
  return new ApiError(401, "unauthorized", message)
}

export function forbidden(message = "You do not have permission to perform this action."): ApiError {
  return new ApiError(403, "forbidden", message)
}

export function badRequest(message: string, details?: unknown): ApiError {
  return new ApiError(400, "bad_request", message, details)
}

export class QuotaError extends ApiError {
  constructor(topics: string[]) {
    super(
      409,
      "topic_quota_exceeded",
      `Topic quota reached for: ${topics.join(", ")}. You may publish at most 2 entries per topic.`,
      { topics },
    )
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  logger.error({ err, path: req.path, method: req.method }, "request-error")

  if (err instanceof ApiError) {
    res.status(err.status).json({
      success: false,
      data: null,
      message: err.message,
      ...(err.details !== undefined && { details: err.details }),
    })
    return
  }

  const message =
    env.NODE_ENV === "development" && err instanceof Error ? err.message : "Something went wrong."

  res.status(500).json({ success: false, data: null, message })
}
