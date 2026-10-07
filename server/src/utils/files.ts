import fs from "node:fs/promises"
import { env } from "../config/index.js"

/**
 * Deletes a stored upload from disk, given the public URL we saved for it.
 *
 * The URL is checked against this API's own base first, so a hand-edited field
 * cannot turn into a path traversal. Both the current shape
 * (`API_BASE_URL/uploads/<folder>/<file>`) and the pre-move shape
 * (`API_BASE_URL/<folder>/<file>`) resolve to the same file. A missing file is
 * not an error, because the row naming it is usually being deleted too.
 */
export async function removeStoredFile(storedUrl: string | null | undefined): Promise<void> {
  if (!storedUrl) return
  const base = env.API_BASE_URL.replace(/\/$/, "")
  if (!storedUrl.startsWith(base + "/")) return
  const rel = storedUrl.slice(base.length + 1) // e.g. "uploads/profiles/a.jpg" or "profiles/a.jpg"
  if (rel.includes("..")) return
  const filePath = rel.startsWith("uploads/") ? rel : `uploads/${rel}`
  await fs.unlink(filePath).catch(() => {})
}
