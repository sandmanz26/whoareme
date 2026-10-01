import { z } from "zod"

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(0).default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default("whoareyou"),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("30d"),

  VIEWER_HASH_SALT: z.string().min(8),

  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ),

  MAX_THUMBNAIL_BYTES: z.coerce.number().int().positive().default(1_500_000),

  // Number of trusted reverse-proxy hops (0 = don't trust any proxy).
  // Override in staging if it sits behind a load balancer.
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).optional(),

  APP_BASE_URL: z.string().url().default("http://localhost:9800"),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),

  MAIL_TRANSPORT: z.enum(["none", "log", "http"]).default("none"),
  MAIL_API_URL: z.string().default(""),
  MAIL_API_KEY: z.string().default(""),
  MAIL_FROM: z.string().default(""),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")
  throw new Error(`Invalid environment:\n${issues}\n\nCopy .env.example to .env and fill it in.`)
}

export const env = parsed.data

if (env.MAIL_TRANSPORT === "http") {
  for (const key of ["MAIL_API_URL", "MAIL_API_KEY", "MAIL_FROM"] as const) {
    if (!env[key]) throw new Error(`MAIL_TRANSPORT=http needs ${key}.`)
  }
}

if (env.NODE_ENV === "production") {
  for (const key of ["JWT_SECRET", "VIEWER_HASH_SALT"] as const) {
    if (env[key].startsWith("change-me")) {
      throw new Error(`${key} still holds its placeholder value. Refusing to start in production.`)
    }
  }

  if (env.MAIL_TRANSPORT === "none") {
    throw new Error(
      "MAIL_TRANSPORT is 'none'. Email verification gates publishing, so production needs a real transport.",
    )
  }
}
