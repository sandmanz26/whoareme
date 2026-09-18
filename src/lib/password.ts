/**
 * Password hashing in the browser, for the local demo account.
 *
 * **This is not a security control, and the sign-in screen says so.** Anyone
 * who can open dev tools can edit `localStorage` and let themselves in. The
 * reason it hashes at all is narrower and still worth doing: people reuse
 * passwords, so storing one in plain text in a browser store would leak a real
 * credential to anything that can read it, for no benefit.
 *
 * PBKDF2 via WebCrypto, because it is in the platform. Rule 1 in CLAUDE.md
 * means no argon2 or bcrypt package. The real gate is `server/src/lib/
 * password.ts`, which uses scrypt with OWASP parameters.
 *
 * Format: `pbkdf2$<iterations>$<saltB64>$<hashB64>`, mirroring the server's
 * `scrypt$...` shape so the prefix says which scheme produced it and old
 * values stay recognisable if this is ever changed.
 */

const ITERATIONS = 150_000
const KEY_BITS = 256

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    // Normalise so the same password typed on two keyboards hashes the same.
    new TextEncoder().encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    KEY_BITS,
  )
  return toBase64(new Uint8Array(bits))
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(password, salt, ITERATIONS)
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${hash}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, saltB64, expected] = stored.split("$")
  if (scheme !== "pbkdf2" || !iterations || !saltB64 || !expected) return false

  const actual = await derive(password, fromBase64(saltB64), Number(iterations))
  // Constant-time-ish: compare every character rather than returning early.
  if (actual.length !== expected.length) return false
  let same = 0
  for (let i = 0; i < actual.length; i += 1) {
    same |= actual.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return same === 0
}

/** The one rule the form enforces. Short enough not to be theatre. */
export const MIN_PASSWORD_LENGTH = 8

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `At least ${MIN_PASSWORD_LENGTH} characters.`
  }
  return null
}
