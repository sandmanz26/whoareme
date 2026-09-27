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

export const LANGUAGES: string[] = ["English", ...new Set(Object.values(COUNTRY_LANGUAGES).flat())]
  .filter((v, i, all) => all.indexOf(v) === i)
  .sort((a, b) => (a === "English" ? -1 : b === "English" ? 1 : a.localeCompare(b)))

export function languagesFor(location: string): string[] {
  const country = location.slice(-2).toUpperCase()
  return ["English", ...(COUNTRY_LANGUAGES[country] ?? [])]
}
