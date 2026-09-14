import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto"
import { promisify } from "node:util"

// promisify drops the options overload, so restate the signature we use.
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>

// OWASP-recommended scrypt parameters (N=2^17, r=8, p=1) at ~64MB per hash.
const N = 1 << 17
const R = 8
const P = 1
const KEY_LENGTH = 64
const MAX_MEMORY = 160 * 1024 * 1024

/**
 * scrypt from node:crypto rather than argon2id, so the API installs with no
 * native build step. If you are comfortable with a native dependency,
 * `@node-rs/argon2` is the stronger choice — swap the two functions below and
 * add a `$argon2` prefix check so existing hashes keep verifying.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N, r: R, p: P, maxmem: MAX_MEMORY,
  })
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${derived.toString("base64")}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltB64, hashB64] = stored.split("$")
  if (scheme !== "scrypt" || !n || !r || !p || !saltB64 || !hashB64) return false

  const salt = Buffer.from(saltB64, "base64")
  const expected = Buffer.from(hashB64, "base64")
  const derived = await scrypt(password.normalize("NFKC"), salt, expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: MAX_MEMORY,
  })

  return derived.length === expected.length && timingSafeEqual(derived, expected)
}
