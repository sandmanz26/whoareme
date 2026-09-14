import { useMemo } from "react"
import { Container } from "@/components/layout/Container"
import { Avatar } from "@/components/ui/Avatar"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { ArrowRight, Pin } from "@/components/ui/Icon"
import { WorkCard } from "@/components/work/WorkCard"
import { proofOf, type Work } from "@/data/work"
import type { Person } from "@/data/people"
import { CATEGORIES, roleById, type CategoryId } from "@/data/taxonomy"
import type { Author } from "@/lib/authors"
import { navigate } from "@/lib/router"
import { cn } from "@/lib/utils"

interface ProfilePageProps {
  person: Person | undefined
  /** Everything this person has published, newest first. */
  work: Work[]
  authors: Map<string, Author>
  /** Reported so a person can see their own profile views in the panel. */
  onProfileView: (personId: string) => void
  onSkillClick: (skill: string) => void
}

interface TopicGroup {
  id: CategoryId
  label: string
  tint: string
  kind: "industry" | "practice"
  items: Work[]
}

/**
 * Group a body of work by topic.
 *
 * An entry with two topics appears under both, on purpose - the question a
 * reader is asking is "what has this person done in banking", and hiding the
 * entry from one of its topics to keep the list tidy answers it wrongly. The
 * count above the grid says "entries", not "unique entries", for the same
 * reason.
 *
 * Groups follow CATEGORIES order rather than being sorted by size, so the two
 * kinds stay adjacent and a profile does not reorder itself as work is added.
 */
function groupByTopic(work: readonly Work[]): TopicGroup[] {
  return CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    tint: category.tint,
    kind: category.kind,
    items: work.filter((item) => item.topics.includes(category.id)),
  })).filter((group) => group.items.length > 0)
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <p className="display text-2xl leading-none">{value}</p>
      <p className="mt-1.5 font-display text-[0.6875rem] font-medium tracking-[0.16em] text-muted uppercase">
        {label}
      </p>
    </div>
  )
}

export function ProfilePage({
  person,
  work,
  authors,
  onProfileView,
  onSkillClick,
}: ProfilePageProps) {
  const groups = useMemo(() => groupByTopic(work), [work])

  if (!person) {
    return (
      <Container className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <h1 className="display text-3xl">Profile not found</h1>
        <p className="mt-3 max-w-sm text-sm text-muted">
          The link may be stale, or this person is no longer listed in the directory.
        </p>
        <Button className="mt-7" onClick={() => navigate("/")}>
          Back to the directory
        </Button>
      </Container>
    )
  }

  const role = roleById(person.role)
  const industries = groups.filter((group) => group.kind === "industry")
  const practices = groups.filter((group) => group.kind === "practice")
  const proofCount = work.reduce((total, item) => total + proofOf(item).length, 0)

  return (
    <div className="pb-24">
      <Container className="pt-8">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill py-2 font-display text-sm font-medium text-muted transition-colors duration-200 hover:text-ink"
        >
          <ArrowRight size={16} className="rotate-180" />
          The directory
        </button>
      </Container>

      {/* ── Identity ─────────────────────────────────────────────────── */}
      <Container className="mt-4">
        <header className="flex flex-col gap-6 border-b border-line pb-10 sm:flex-row sm:items-start sm:gap-8">
          <Avatar
            src={person.photo}
            name={person.name}
            className="size-24 shrink-0 rounded-[30%] border border-ink/10 bg-paper-2 sm:size-28"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="display text-[clamp(1.75rem,5vw,2.75rem)]">{person.name}</h1>
              {person.open && (
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-pop-lime px-3 py-1 font-display text-[0.6875rem] font-semibold tracking-wide text-ink">
                  <span className="size-1.5 rounded-full bg-ink" />
                  OPEN TO WORK
                </span>
              )}
            </div>

            <p className="mt-2 text-base text-ink-2">
              {person.title} · {person.company}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
              <Pin size={14} className="shrink-0" />
              {person.location}
            </p>

            <ul className="mt-5 flex flex-wrap gap-1.5">
              <li>
                <Badge className="border-ink/20 bg-paper-2">{role.label}</Badge>
              </li>
              {person.skills.map((skill, index) => (
                <li key={`${skill}-${index}`}>
                  <button
                    type="button"
                    onClick={() => onSkillClick(skill)}
                    className="cursor-pointer rounded-pill transition-transform duration-200 ease-pop active:scale-[0.97]"
                  >
                    <Badge className="hover:border-ink/40">{skill}</Badge>
                    <span className="sr-only">Filter portfolios by {skill}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-8 sm:flex-col sm:gap-5 sm:border-l sm:border-line sm:pl-8">
            <Stat value={work.length} label="Entries" />
            <Stat value={groups.length} label="Topics" />
            <Stat value={person.years} label="Years" />
          </div>
        </header>
      </Container>

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {work.length === 0 ? (
        <Container className="py-20 text-center">
          <h2 className="display text-2xl">No published work yet</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">
            {person.name.split(" ")[0]} is listed in the directory but has not published a case
            study. A profile without work is a business card - this product is the other thing.
          </p>
        </Container>
      ) : (
        <>
          {/* ── Topic index ──────────────────────────────────────────── */}
          <Container className="mt-10">
            <div className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 sm:flex-row sm:items-start sm:gap-8">
              <TopicIndex title="Industry" groups={industries} />
              <TopicIndex title="Practice" groups={practices} />
            </div>
            <p className="mt-3 text-xs text-muted">
              {proofCount} results claimed across {work.length}{" "}
              {work.length === 1 ? "entry" : "entries"}. An entry that shipped in two topics is
              listed under both.
            </p>
          </Container>

          {/* ── The work, split by topic ─────────────────────────────── */}
          {groups.map((group) => (
            <section
              key={group.id}
              id={`topic-${group.id}`}
              className="scroll-mt-24 border-t border-line pt-12 mt-14"
            >
              <Container>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="display flex items-center gap-3 text-[clamp(1.375rem,3vw,1.875rem)]">
                    <span
                      aria-hidden="true"
                      className={cn("size-2.5 rounded-full", group.tint.split(" ")[0])}
                    />
                    {group.label}
                  </h2>
                  <p className="font-display text-sm font-medium text-muted">
                    {group.items.length} {group.items.length === 1 ? "entry" : "entries"}
                    {group.kind === "practice" && " · practice, not an industry"}
                  </p>
                </div>

                <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item, index) => (
                    <div key={item.id} className="flex min-w-0">
                      <WorkCard
                        work={item}
                        author={authors.get(item.authorId)}
                        index={index}
                        onSkillClick={onSkillClick}
                      />
                    </div>
                  ))}
                </div>
              </Container>
            </section>
          ))}
        </>
      )}

      {/* ── Footer action ────────────────────────────────────────────── */}
      <Container className="mt-16">
        <div className="flex flex-col items-start gap-4 rounded-card border border-line bg-paper-2/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-2">
            Every number on this page is{" "}
            <span className="font-display font-semibold text-ink">claimed by the author</span>, not
            verified by us.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              onProfileView(person.id)
              navigate("/work")
            }}
          >
            Browse every portfolio
            <ArrowRight size={16} />
          </Button>
        </div>
      </Container>
    </div>
  )
}

/** Jump links, so a long profile is navigable without scrolling past it. */
function TopicIndex({ title, groups }: { title: string; groups: TopicGroup[] }) {
  if (groups.length === 0) return null

  return (
    <div className="min-w-0 flex-1">
      <h2 className="eyebrow">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {groups.map((group) => (
          <li key={group.id}>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById(`topic-${group.id}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-pill border border-ink/12 bg-paper px-3 font-display text-xs font-medium text-ink-2 transition-colors duration-200 hover:border-ink/40 hover:text-ink"
            >
              <span
                aria-hidden="true"
                className={cn("size-1.5 rounded-full", group.tint.split(" ")[0])}
              />
              {group.label}
              <span className="text-muted">{group.items.length}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Exported for the case-study page's "back to profile" affordance. */
export function profileHref(authorId: string): string {
  return `/people/${authorId}`
}
