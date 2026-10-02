import { EXPERIENCE_BANDS } from "../constant/app.js"

export function experienceCondition(
  bands: string[],
  field: string,
): Record<string, unknown> | null {
  const chosen = EXPERIENCE_BANDS.filter((band) => bands.includes(band.id))
  if (chosen.length === 0) return null
  return {
    $or: chosen.map((band) => ({
      [field]: band.max === null ? { $gte: band.min } : { $gte: band.min, $lt: band.max },
    })),
  }
}

export function languageCondition(
  languages: string[],
  field: string,
): Record<string, unknown> | null {
  if (languages.length === 0) return null
  return { [field]: { $in: languages } }
}
