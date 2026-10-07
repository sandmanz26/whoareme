import pino from "pino"
import { env } from "../config/index.js"

export const logger = pino({
  level: env.LOG_LEVEL,
  // pino-http serializes request headers, which include the bearer token and
  // any cookie. Error payloads can carry a user document. None of that belongs
  // in a log line, so it is removed before it is written.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.token",
    ],
    remove: true,
  },
  ...(env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, ignore: "pid,hostname" },
    },
  }),
})
