import { z } from "zod"

/**
 * Fail fast and loudly on a bad environment. A server that boots with a
 * placeholder JWT secret is worse than one that refuses to start.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default("whoareyou"),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  VIEWER_HASH_SALT: z.string().min(8),

  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) => value.split(",").map((o) => o.trim()).filter(Boolean)),

  MAX_THUMBNAIL_BYTES: z.coerce.number().int().positive().default(1_500_000),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")
  throw new Error(`Invalid environment:\n${issues}\n\nCopy .env.example to .env and fill it in.`)
}

export const env = parsed.data

if (env.NODE_ENV === "production") {
  for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "VIEWER_HASH_SALT"] as const) {
    if (env[key].startsWith("change-me")) {
      throw new Error(`${key} still holds its placeholder value. Refusing to start in production.`)
    }
  }
}
