import { z } from "zod"

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(0).default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default("whoareyou"),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("30d"),

  // Separate key for hashing one-time tokens (email verification, password
  // reset). Reusing JWT_SECRET would mean one leak compromised both signing
  // and the ability to check stored token hashes.
  TOKEN_HASH_SECRET: z.string().min(32),

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

  // none        development only, the token comes back in the response
  // log         written to the log instead of sent
  // resend      JSON POST to MAIL_API_URL (Resend API)
  // nodemailer  SMTP, e.g. a Google account with an app password
  // http        legacy alias for resend
  MAIL_TRANSPORT: z
    .enum(["none", "log", "resend", "nodemailer", "http"])
    .default("none")
    .transform((value) => (value === "http" ? "resend" : value)),
  MAIL_API_URL: z.string().default(""),
  MAIL_API_KEY: z.string().default(""),
  MAIL_FROM: z.string().default(""),

  // SMTP transport (MAIL_TRANSPORT=nodemailer). A Google account needs an App
  // Password, not the account password. Leave SMTP_HOST empty to use the
  // well-known service named by SMTP_SERVICE.
  SMTP_SERVICE: z.string().default("gmail"),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().max(65535).default(587),
  SMTP_SECURE: z
    .string()
    .default("false")
    .transform((value) => value === "true" || value === "1"),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")
  throw new Error(`Invalid environment:\n${issues}\n\nCopy .env.example to .env and fill it in.`)
}

export const env = parsed.data

if (env.MAIL_TRANSPORT === "resend") {
  for (const key of ["MAIL_API_URL", "MAIL_API_KEY", "MAIL_FROM"] as const) {
    if (!env[key]) throw new Error(`MAIL_TRANSPORT=resend needs ${key}.`)
  }
}

if (env.MAIL_TRANSPORT === "nodemailer") {
  for (const key of ["MAIL_FROM", "SMTP_USER", "SMTP_PASS"] as const) {
    if (!env[key]) throw new Error(`MAIL_TRANSPORT=nodemailer needs ${key}.`)
  }
  if (!env.SMTP_HOST && !env.SMTP_SERVICE) {
    throw new Error("MAIL_TRANSPORT=nodemailer needs SMTP_HOST or SMTP_SERVICE.")
  }
}

if (env.NODE_ENV === "production") {
  for (const key of ["JWT_SECRET", "TOKEN_HASH_SECRET", "VIEWER_HASH_SALT"] as const) {
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
