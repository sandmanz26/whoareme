const COUNTRY_LANGUAGES: Record<string, string[]> = {
  ID: ["English", "Bahasa Indonesia"],
  SG: ["English", "Mandarin", "Malay", "Tamil"],
  MY: ["English", "Malay", "Mandarin"],
  PH: ["English", "Filipino"],
  TH: ["English", "Thai"],
  VN: ["English", "Vietnamese"],
  KH: ["English", "Khmer"],
  MM: ["English", "Burmese"],
  BN: ["English", "Malay"],
  LA: ["English", "Lao"],
  TL: ["English", "Tetum"],
}

/**
 * Derive working languages from a location string.
 * Looks for a two-letter country code at the end of the string (e.g. "Jakarta, ID").
 * Always includes English as a fallback.
 */
export function languagesFor(location: string): string[] {
  const match = location.match(/,?\s*([A-Z]{2})$/)
  const code = match?.[1]
  return COUNTRY_LANGUAGES[code ?? ""] ?? ["English"]
}
