import type { Work } from "@/data/work"
import { withinBand } from "@/data/experience"
import type { Filters } from "@/components/home/FilterBar"
import type { Author } from "./authors"

function haystackOf(work: Work, author?: Author): string {
  return [
    work.title,
    work.summary,
    work.problem,
    work.approach,
    work.outcome,
    ...work.stack,
    ...work.skills,
    ...work.details.map((detail) => `${detail.label} ${detail.value}`),
    author?.name ?? "",
    author?.company ?? "",
    author?.location ?? "",
  ]
    .join(" ")
    .toLowerCase()
}

/** Every word has to appear somewhere, so extra terms narrow rather than widen. */
function matchesQuery(work: Work, query: string, author?: Author): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const haystack = haystackOf(work, author)
  return needle.split(/\s+/).every((word) => haystack.includes(word))
}

/**
 * Experience and language belong to the person, not the entry. Applying them to
 * work through the author keeps one filter bar honest across both surfaces:
 * picking "German" narrows the people list and the case studies to the same
 * set of humans, rather than silently doing nothing on one of them.
 *
 * An entry whose author is not in the index (a deleted account, a fixture
 * mismatch) fails a person filter rather than passing it. Showing work while
 * claiming it matches a language we cannot verify is the worse failure.
 */
function matchesAuthor(filters: Filters, author: Author | undefined): boolean {
  if (filters.experience.length === 0 && filters.language.length === 0) return true
  if (!author) return false
  return (
    (filters.experience.length === 0 ||
      filters.experience.some((band) => withinBand(author.years, band))) &&
    (filters.language.length === 0 ||
      filters.language.some((language) => author.languages.includes(language)))
  )
}

export function filterWork(
  work: readonly Work[],
  filters: Filters,
  authors: Map<string, Author>,
): Work[] {
  return work.filter((item) => {
    const author = authors.get(item.authorId)
    return (
      // Empty list means no opinion; otherwise any one of the values will do.
      (filters.role.length === 0 || filters.role.includes(item.role)) &&
      (filters.topic.length === 0 ||
        filters.topic.some((topic) => item.topics.includes(topic))) &&
      (filters.practice.length === 0 ||
        filters.practice.some((practice) => item.topics.includes(practice))) &&
      (filters.model.length === 0 ||
        (item.model !== undefined && filters.model.includes(item.model))) &&
      matchesAuthor(filters, author) &&
      filters.skills.every((skill) => item.skills.includes(skill)) &&
      matchesQuery(item, filters.query, author)
    )
  })
}

/**
 * Skills present in a set of work, most common first. Driving the chip row
 * from the visible results means it never offers a filter that returns nothing.
 */
export function skillFacets(work: readonly Work[], limit = 14): string[] {
  const counts = new Map<string, number>()
  for (const item of work) {
    for (const skill of item.skills) counts.set(skill, (counts.get(skill) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([skill]) => skill)
}
