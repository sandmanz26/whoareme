import type { Document } from "mongodb"
import { EXPERIENCE_BANDS, type ExperienceBandId } from "../types.js"

/**
 * The two filter axes that are about the person rather than the work.
 *
 * Both are OR-ed within themselves and AND-ed against everything else, which
 * is the rule the whole filter bar follows: picking a second language widens,
 * picking a language *and* a topic narrows. `skills` is the deliberate
 * exception, AND-ed within itself, because "React and Go" means someone who
 * has both.
 *
 * These return conditions to be pushed onto a `$and`, not a match object to
 * merge. Merging would silently drop one `$or` on top of another - a bug that
 * looks like a filter quietly doing nothing.
 */

/** `years` bands as an OR of half-open ranges. `null` when nothing is selected. */
export function experienceCondition(bands: string[], field: string): Document | null {
  const chosen = EXPERIENCE_BANDS.filter((band) => bands.includes(band.id))
  if (chosen.length === 0) return null

  return {
    $or: chosen.map((band) => ({
      [field]: band.max === null ? { $gte: band.min } : { $gte: band.min, $lt: band.max },
    })),
  }
}

/** Any of the named languages. The field is multikey, so `$in` is the match. */
export function languageCondition(languages: string[], field: string): Document | null {
  if (languages.length === 0) return null
  return { [field]: { $in: languages } }
}

export function isExperienceBand(value: string): value is ExperienceBandId {
  return EXPERIENCE_BANDS.some((band) => band.id === value)
}
