const TRANSLITERATIONS: Record<string, string> = {
  ø: "o", æ: "ae", œ: "oe", ł: "l", đ: "d", ð: "d", þ: "th", ß: "ss",
}

/** Matches the client's slug rules exactly, so ids stay stable across the stack. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[øæœłđðþß]/g, (char) => TRANSLITERATIONS[char] ?? char)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 100)
}

/** Appends `-2`, `-3`… until `exists` reports the slug is free. */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  const root = slugify(base) || "entry"
  if (!(await exists(root))) return root
  for (let n = 2; n < 100; n += 1) {
    const candidate = `${root}-${n}`
    if (!(await exists(candidate))) return candidate
  }
  return `${root}-${Date.now().toString(36)}`
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Query words, AND-ed by the caller so extra terms narrow rather than widen. */
export function tokenize(query: string | undefined): string[] {
  if (!query) return []
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8)
}

/**
 * The denormalised lowercase haystack the listing queries match against.
 * Rebuild it on every write — see `scripts/reconcile-counts.ts` for a backfill
 * if the field list changes.
 */
export function buildSearchBlob(parts: Array<string | undefined | null>): string {
  return parts.filter(Boolean).join(" ").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 4000)
}
