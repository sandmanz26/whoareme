import type { Account } from "@/data/account"
import { PEOPLE, languagesFor, type Person } from "@/data/people"
import type { Work } from "@/data/work"
import type { CategoryId, RoleId } from "@/data/taxonomy"
import { linksFor, type PersonLink } from "@/data/platforms"

export interface Author {
  id: string
  name: string
  title: string
  company: string
  location: string
  role: RoleId
  /** Carried on the author so the one filter bar can narrow work by the
   *  person who made it, not just narrow the people list. */
  years: number
  languages: string[]
  photo?: string
  links: PersonLink[]
  /** True for the signed-in person, so their own work can be marked as theirs. */
  isViewer?: boolean
}

const SEED_AUTHORS = new Map<string, Author>(
  PEOPLE.map((person) => [
    person.id,
    {
      id: person.id,
      name: person.name,
      title: person.title,
      company: person.company,
      location: person.location,
      role: person.role,
      years: person.years,
      languages: person.languages,
      photo: person.photo,
      links: person.links,
    },
  ]),
)

/**
 * The signed-in person joins the directory like everyone else - that is what
 * makes their profile-view counter mean anything.
 */
export function personFromAccount(account: Account, skills: string[]): Person {
  return {
    id: account.id,
    name: account.name,
    title: account.title || "Add your title",
    company: "Independent",
    role: account.role,
    categories: account.topics,
    location: account.location,
    skills: skills.slice(0, 4),
    years: Number(account.years) || 0,
    open: true,
    photo: account.photo ?? "",
    links: account.portfolio
      ? [{ platform: "website", href: account.portfolio, handle: account.portfolio.replace(/^https?:\/\//, "") }]
      : linksFor(account.role, account.id),
    languages: languagesFor(account.location),
    bio: account.pitch ?? "",
  }
}

export function authorIndex(account: Account | null): Map<string, Author> {
  if (!account) return SEED_AUTHORS

  const merged = new Map(SEED_AUTHORS)
  merged.set(account.id, {
    id: account.id,
    name: account.name,
    title: account.title,
    company: "Independent",
    location: account.location,
    role: account.role,
    years: Number(account.years) || 0,
    languages: languagesFor(account.location),
    // A real account states its own links; until it does, the portfolio URL
    // given at signup is the only one we can honestly show.
    links: account.portfolio
      ? [
          {
            platform: "website" as const,
            href: account.portfolio,
            handle: account.portfolio.replace(/^https?:\/\//, ""),
          },
        ]
      : [],
    isViewer: true,
  })
  return merged
}

/**
 * Widen each person's topics with the topics their published work carries.
 *
 * `Person.categories` is the industry a person is filed under, written by hand
 * in the fixtures. Practice topics - design ops, hiring, reliability - never
 * appear there, so without this a reader who filters the directory by "Design
 * Ops" sees nine case studies and zero people, which reads as a bug and is
 * really a modelling gap.
 *
 * Deriving from the work is also the more honest answer: this directory's claim
 * is that a person belongs to a topic because of what they shipped in it, not
 * because of a label someone typed on their profile.
 */
export function withDerivedTopics(people: readonly Person[], work: readonly Work[]): Person[] {
  const byAuthor = new Map<string, Set<CategoryId>>()
  for (const item of work) {
    const owned = byAuthor.get(item.authorId) ?? new Set<CategoryId>()
    for (const topic of item.topics) owned.add(topic)
    byAuthor.set(item.authorId, owned)
  }

  return people.map((person) => {
    const derived = byAuthor.get(person.id)
    if (!derived) return person

    const merged = [...new Set([...person.categories, ...derived])]
    // Identity matters here: an unchanged array keeps downstream memos stable.
    return merged.length === person.categories.length ? person : { ...person, categories: merged }
  })
}
