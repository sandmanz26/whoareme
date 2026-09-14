import pino from "pino"
import { env } from "../config/env.js"

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.passwordHash"],
    remove: true,
  },
  ...(env.NODE_ENV === "development"
    ? { transport: { target: "pino/file", options: { destination: 1 } } }
    : {}),
})
