/**
 * Experience as bands, not a number input.
 *
 * A reviewer scanning a directory does not think "8 years or more"; they think
 * "someone senior" or "someone early". Bands also stop the filter implying a
 * precision the data does not have: a person who wrote 7 and a person who wrote
 * 8 are the same person to anyone hiring.
 *
 * Bounds are inclusive of `min` and exclusive of `max`, so they tile with no
 * gap and no overlap.
 */
export const EXPERIENCE_BANDS = [
  { id: "0-4", label: "Under 5 years", min: 0, max: 5 },
  { id: "5-9", label: "5 to 9 years", min: 5, max: 10 },
  { id: "10-14", label: "10 to 14 years", min: 10, max: 15 },
  { id: "15", label: "15 years or more", min: 15, max: Infinity },
] as const

export type ExperienceBandId = (typeof EXPERIENCE_BANDS)[number]["id"]

export function experienceBandById(id: ExperienceBandId | null) {
  return EXPERIENCE_BANDS.find((band) => band.id === id)
}

export function withinBand(years: number, id: ExperienceBandId | null): boolean {
  if (id === null) return true
  const band = experienceBandById(id)
  if (!band) return true
  return years >= band.min && years < band.max
}
