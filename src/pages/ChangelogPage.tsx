import { PageIntro, Prose } from "@/components/layout/PageIntro"
import { Badge } from "@/components/ui/Badge"

type Kind = "added" | "changed" | "fixed" | "removed"

const KIND_TINT: Record<Kind, string> = {
  added: "border-ink/20 bg-pop-lime",
  changed: "border-ink/20 bg-pop-sky",
  fixed: "border-ink/20 bg-pop-tangerine",
  removed: "border-ink/20 bg-pop-pink",
}

interface Release {
  version: string
  date: string
  summary: string
  entries: Array<{ kind: Kind; text: string }>
}

/**
 * Newest first. Entries say what changed for a reader of the directory, not
 * which files moved - a changelog that lists refactors is a commit log with
 * extra steps.
 */
const RELEASES: Release[] = [
  {
    version: "0.4",
    date: "13 September 2026",
    summary:
      "Two filters that describe the person rather than the work, and a pass over the copy and the type hierarchy.",
    entries: [
      {
        kind: "added",
        text: "Filter by years of experience, in bands rather than an exact number. Nobody hiring distinguishes seven years from eight, and the bands stop the control implying a precision the data does not have.",
      },
      {
        kind: "added",
        text: "Filter by working language. Applies to the people list and to case studies through their author, so picking German narrows both to the same set of humans.",
      },
      {
        kind: "changed",
        text: "The filter bar now labels its controls instead of hiding the labels from everyone but screen readers, and summarises what is active as a row of removable chips. With five controls, a row of identical pills showing only their current value was unreadable.",
      },
      {
        kind: "changed",
        text: "Case study chapters read as headings rather than as small uppercase labels. Every section carrying the same micro-label gave the page a templated rhythm that buried the argument under the metadata.",
      },
      {
        kind: "removed",
        text: "Every em dash in the interface, and three of the four section labels on the home page. Both are house style now rather than a preference applied unevenly.",
      },
      {
        kind: "fixed",
        text: "The hero stated a topic count that stopped being true when practice topics were added, and its background wash used two literal colour values instead of the palette tokens.",
      },
      {
        kind: "fixed",
        text: "Paging through the portfolio grid or the directory did not reset when a filter changed that the reset logic had not been told about.",
      },
    ],
  },
  {
    version: "0.3",
    date: "12 September 2026",
    summary:
      "Profiles became real pages, and the topic axis stopped pretending every piece of work has a business case.",
    entries: [
      {
        kind: "added",
        text: "Profile pages. Opening a person from the directory, a card byline or a case study now leads somewhere, and their portfolio is split by topic rather than presented as one undifferentiated grid.",
      },
      {
        kind: "added",
        text: "Practice topics - Design Ops, Developer Experience, Accessibility, Hiring & Teams, Reliability - alongside the industries. The topic filter groups the two kinds so a practice is never read as a market.",
      },
      {
        kind: "added",
        text: "A back route from a case study to its author’s profile, for readers who arrived by reading a person rather than by browsing everything.",
      },
      {
        kind: "added",
        text: "56 further case studies, concentrated on a smaller set of people so a profile has enough in it to be worth grouping. Every seeded person still respects the two-per-topic quota.",
      },
      {
        kind: "added",
        text: "About, Changelog and Privacy pages. The footer links had been decorative.",
      },
    ],
  },
  {
    version: "0.2",
    date: "11 September 2026",
    summary: "The API landed in the repository. The interface has not been moved onto it yet.",
    entries: [
      {
        kind: "added",
        text: "An Express and MongoDB API covering auth, the directory, work CRUD, publish, traffic and thumbnail uploads.",
      },
      {
        kind: "added",
        text: "The two-per-topic quota enforced server-side as a single guarded atomic update, so two concurrent publishes cannot both slip through.",
      },
      {
        kind: "changed",
        text: "Similarity scoring now exists in two places - client and aggregation pipeline - and they are required to stay identical.",
      },
      {
        kind: "fixed",
        text: "A rate limiter configured with a limit of zero was blocking every request rather than disabling itself. Caught by the smoke test.",
      },
    ],
  },
  {
    version: "0.1",
    date: "10 September 2026",
    summary: "First public build of the directory, running entirely in the browser.",
    entries: [
      {
        kind: "added",
        text: "Home, portfolio index and case study pages, with filtering by craft, topic, business model and skill.",
      },
      {
        kind: "added",
        text: "An authoring panel with role-specific evidence forms - eight crafts, one renderer, one validator - plus a free-form mode for people who want their own headings.",
      },
      {
        kind: "added",
        text: "Generated case-study covers, so confidential work is not visually second-class and the grid does not become a design competition.",
      },
      {
        kind: "removed",
        text: "A prototype like button, removed before launch. Popularity ranking is the dynamic this product exists to avoid.",
      },
    ],
  },
]

export function ChangelogPage() {
  return (
    <div>
      <PageIntro
        eyebrow="Changelog"
        title="What changed, and when"
        lede="Written for someone using the directory. Refactors, dependency bumps and anything invisible from the outside are left out on purpose."
        meta="Dates are the day the change went into this build."
      />

      <Prose>
        {RELEASES.map((release) => (
          <section key={release.version}>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="display text-2xl">v{release.version}</h2>
              <p className="font-display text-sm font-medium text-muted">{release.date}</p>
            </div>
            <p className="mt-3 text-base leading-relaxed text-ink-2">{release.summary}</p>

            <ul className="mt-6 flex flex-col gap-4">
              {release.entries.map((entry, index) => (
                <li
                  key={`${entry.kind}-${index}`}
                  className="flex min-w-0 flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:gap-4"
                >
                  <span className="shrink-0">
                    <Badge className={`${KIND_TINT[entry.kind]} uppercase`}>{entry.kind}</Badge>
                  </span>
                  <p className="min-w-0 text-sm leading-relaxed text-ink-2">{entry.text}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Prose>
    </div>
  )
}
