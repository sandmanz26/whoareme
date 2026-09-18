/**
 * Working languages, derived from the country in `location`.
 *
 * Mirrors `languagesFor` in the SPA's `src/data/people.ts`. Duplicated rather
 * than imported, because the API never reads the SPA's source tree - and
 * because the two have different jobs: there it seeds fixture rows, here it
 * gives a new account a sensible default the person can then correct.
 *
 * English is on every row, because this is a directory of people who work in
 * tech internationally. That makes the English filter near-useless and every
 * other language genuinely useful, which is the honest trade.
 */
const COUNTRY_LANGUAGES: Record<string, string[]> = {
  BN: ["Malay"],
  ID: ["Bahasa Indonesia"],
  KH: ["Khmer"],
  LA: ["Lao"],
  MM: ["Burmese"],
  MY: ["Malay", "Mandarin", "Tamil"],
  PH: ["Filipino"],
  SG: ["Mandarin", "Malay", "Tamil"],
  TH: ["Thai"],
  VN: ["Vietnamese"],
}

/** Every language the taxonomy knows about, English first then alphabetical. */
export const LANGUAGES: string[] = ["English", ...new Set(Object.values(COUNTRY_LANGUAGES).flat())]
  .filter((value, index, all) => all.indexOf(value) === index)
  .sort((a, b) => (a === "English" ? -1 : b === "English" ? 1 : a.localeCompare(b)))

export function languagesFor(location: string): string[] {
  const country = location.slice(-2).toUpperCase()
  return ["English", ...(COUNTRY_LANGUAGES[country] ?? [])]
}
