import type { NextFunction, Request, RequestHandler, Response } from "express"

/**
 * Express 5 forwards rejected promises to the error middleware on its own, but
 * wrapping keeps the intent explicit and keeps handlers working if this ever
 * runs on Express 4.
 */
export function asyncHandler<T extends RequestHandler>(handler: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    void Promise.resolve(handler(req, res, next)).catch(next)
  }
}
