/** Errors the API is willing to describe to a client. Anything else is a 500. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, "bad_request", message, details)

export const unauthorized = (message = "Authentication required.") =>
  new ApiError(401, "unauthorized", message)

export const forbidden = (message = "You do not have access to that.") =>
  new ApiError(403, "forbidden", message)

export const notFound = (what = "Resource") => new ApiError(404, "not_found", `${what} not found.`)

export const conflict = (message: string, details?: unknown) =>
  new ApiError(409, "conflict", message, details)

export const tooLarge = (message: string) => new ApiError(413, "payload_too_large", message)

/**
 * The two-per-topic cap. Carries the offending topics so the client can mark
 * exactly which chips are full instead of showing a generic failure.
 */
export class QuotaError extends ApiError {
  constructor(topics: string[], quota: number) {
    super(409, "topic_quota_exceeded", `Already at ${quota} published entries in: ${topics.join(", ")}.`, {
      topics,
      quota,
    })
  }
}
