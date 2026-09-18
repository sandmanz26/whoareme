import type { Person } from "@/data/people"
import type { CategoryId, RoleId } from "@/data/taxonomy"
import { withinBand } from "@/data/experience"
import type { Filters } from "@/components/home/FilterBar"

function matchesQuery(person: Person, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true

  const haystack = [person.name, person.title, person.company, person.location, ...person.skills]
    .join(" ")
    .toLowerCase()

  // Every word must appear somewhere, so "rust jakarta" narrows rather than widens.
  return needle.split(/\s+/).every((word) => haystack.includes(word))
}

export function filterPeople(people: readonly Person[], filters: Filters): Person[] {
  return people.filter(
    (person) =>
      (filters.topic.length === 0 ||
        filters.topic.some((topic) => person.categories.includes(topic))) &&
      (filters.practice.length === 0 ||
        filters.practice.some((practice) => person.categories.includes(practice))) &&
      (filters.role.length === 0 || filters.role.includes(person.role)) &&
      (filters.experience.length === 0 ||
        filters.experience.some((band) => withinBand(person.years, band))) &&
      (filters.language.length === 0 ||
        filters.language.some((language) => person.languages.includes(language))) &&
      filters.skills.every((skill) =>
        person.skills.some((owned) => owned.toLowerCase() === skill.toLowerCase()),
      ) &&
      matchesQuery(person, filters.query),
  )
}

export function countByRole(people: readonly Person[]): Record<RoleId, number> {
  return people.reduce(
    (counts, person) => {
      counts[person.role] = (counts[person.role] ?? 0) + 1
      return counts
    },
    {} as Record<RoleId, number>,
  )
}

export function countByCategory(people: readonly Person[]): Record<CategoryId, number> {
  return people.reduce(
    (counts, person) => {
      for (const category of person.categories) {
        counts[category] = (counts[category] ?? 0) + 1
      }
      return counts
    },
    {} as Record<CategoryId, number>,
  )
}
