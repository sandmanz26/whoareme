function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[øæœłđðþß]/g, (c) =>
      ({ ø: "o", æ: "ae", œ: "oe", ł: "l", đ: "d", ð: "d", þ: "th", ß: "ss" }[c] ?? c),
    )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

export async function uniqueSlug(
  name: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(name)
  if (!(await exists(base))) return base

  for (let i = 2; i <= 100; i++) {
    const candidate = `${base}-${i}`
    if (!(await exists(candidate))) return candidate
  }

  throw new Error(`Could not find a unique slug for "${name}"`)
}
