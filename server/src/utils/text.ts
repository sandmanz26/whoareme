export function buildSearchBlob(fields: (string | undefined | null)[]): string {
  return fields
    .filter((f): f is string => Boolean(f))
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
