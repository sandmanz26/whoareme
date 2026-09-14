import type { NextFunction, Request, Response } from "express"
import type { ZodTypeAny, z } from "zod"

declare module "express-serve-static-core" {
  interface Request {
    valid?: { body?: unknown; query?: unknown; params?: unknown }
  }
}

/**
 * Parsed values land on `req.valid` rather than overwriting `req.query`, which
 * is a getter in Express 5 and cannot be reassigned.
 */
export function validate(schemas: { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.valid = {
        ...(schemas.body ? { body: schemas.body.parse(req.body) } : {}),
        ...(schemas.query ? { query: schemas.query.parse(req.query) } : {}),
        ...(schemas.params ? { params: schemas.params.parse(req.params) } : {}),
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}

export function body<T extends ZodTypeAny>(req: Request, _schema: T): z.infer<T> {
  return req.valid?.body as z.infer<T>
}

export function query<T extends ZodTypeAny>(req: Request, _schema: T): z.infer<T> {
  return req.valid?.query as z.infer<T>
}

export function params<T extends ZodTypeAny>(req: Request, _schema: T): z.infer<T> {
  return req.valid?.params as z.infer<T>
}
