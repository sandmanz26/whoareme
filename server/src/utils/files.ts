import fs from "node:fs/promises"
import path from "node:path"
import { env } from "../config/index.js"

/**
 * Deletes a stored upload from disk, given the public URL we saved for it.
 *
 * The URL is checked against this API's own base first, so a hand-edited field
 * cannot turn into a path traversal: anything that does not start with
 * `API_BASE_URL/` is ignored. A missing file is not an error, because the row
 * that named it is usually being deleted in the same breath.
 */
export async function removeStoredFile(storedUrl: string | null | undefined): Promise<void> {
  if (!storedUrl) return
  const base = env.API_BASE_URL.replace(/\/$/, "")
  if (!storedUrl.startsWith(base + "/")) return
  const rel = storedUrl.slice(base.length + 1) // e.g. "profiles/abc.jpg"
  await fs.unlink(path.join("uploads", rel)).catch(() => {})
}
