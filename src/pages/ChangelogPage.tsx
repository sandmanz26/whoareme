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
    version: "1.0-rc.1",
    date: "18 September 2026",
    summary: "The three things that were blocking a public launch, and the risks named alongside them.",
    entries: [
      {
        kind: "changed",
        text: "URLs are real paths now, not fragments. A fragment never reaches the server and search engines collapse every one into a single URL, so none of the case studies could be indexed and getting found for your work could not happen. Each page also carries its own title, description, canonical and social card, so a shared entry shows what it is instead of a bare link.",
      },
      {
        kind: "added",
        text: "A moderation notice, created in the same operation as the decision. If your work comes down you are told the reason a person wrote, and you can contest it. An overturned appeal actually puts the entry back.",
      },
      {
        kind: "added",
        text: "Funnel counters and a Funnel view in the console, so completion rate of a first entry is measurable. Counters only: no cookies, no third-party script, no identifier, nothing that could reconstruct a session.",
      },
      {
        kind: "added",
        text: "A real 404, robots.txt, and a sitemap generated at build time from the launch scope. Unknown paths used to render the home page, which told a visitor nothing and told a crawler every broken link was another copy of the front page.",
      },
      {
        kind: "added",
        text: "A confidentiality prompt beside the evidence fields, where the figure gets typed rather than in terms nobody reads. It offers the way out too: the shape of a result is usually publishable when the raw number is not.",
      },
      {
        kind: "added",
        text: "Email verification on the API, and publishing requires a verified address. Drafting does not, so nobody writing their first entry is blocked. Reporting is rate limited: the cost of a flood is a queue nobody can read, and a queue nobody reads is the same as no moderation.",
      },
      {
        kind: "changed",
        text: "Typefaces are served from this site. They came from the Google Fonts CDN, which meant every visitor's IP address reached a third party before the page rendered. Only the latin subsets ship.",
      },
    ],
  },
  {
    version: "0.9",
    date: "18 September 2026",
    summary: "Launching four crafts instead of eight, and the legal pages a platform that removes things is obliged to publish.",
    entries: [
      {
        kind: "changed",
        text: "Designer, Developer, Product and DevOps are open. Data & AI, QA, Growth and Research appear in the craft grid marked Soon and cannot be selected. A craft with nine entries reads as abandoned, and a reviewer who filters to one and finds three thin profiles learns the wrong thing about the whole directory.",
      },
      {
        kind: "changed",
        text: "The home page leads with the difference rather than the feature: not a gallery of screenshots, every entry states the problem, the decisions and the number that changed.",
      },
      {
        kind: "added",
        text: "Terms, a content policy and an accessibility statement, in a Legal column in the footer. The content policy lists what stays up as well as what comes down, and the terms lead on confidentiality, because this product asks for the one thing an NDA usually covers.",
      },
      {
        kind: "fixed",
        text: "The hero counted the whole fixture set while the index next to it counted the launch scope, so it claimed 54 case studies above a page listing 37.",
      },
      {
        kind: "fixed",
        text: "The privacy page claimed one third-party request and named only the portrait host. Google Fonts is a second, and the page now says so.",
      },
    ],
  },
  {
    version: "0.8",
    date: "18 September 2026",
    summary: "A dialog bug that made the sign-up form almost unusable, and two things the panel should always have had.",
    entries: [
      {
        kind: "added",
        text: "Sign in and sign up are two different doors now, and there is a forgot-password path beside the sign-in form. Signing out ends the session and leaves your profile in place, so there is something to come back to; removing it is its own button in the profile panel.",
      },
      {
        kind: "added",
        text: "Open counts on your own entries, in the panel list and on the case study itself. Only you see them. A public count would be a popularity signal, which is the ranking dynamic this directory is built to avoid.",
      },
      {
        kind: "fixed",
        text: "You could type one character into any field in a dialog and then focus jumped to the close button. The dialog moved focus on every render rather than only when it opened, so every keystroke reset it. Reported by a person trying to register, which is the worst place to have it.",
      },
      {
        kind: "added",
        text: "A portrait and a proper bio on the profile form. The portrait is optional and falls back to a monogram tinted from your name, because plenty of people have good reasons not to put their face on a public directory.",
      },
      {
        kind: "added",
        text: "Revert to draft, straight from the portfolio list. Publishing still happens in the editor, where validation and the topic quota live; a one-click publish from the list would be a way around a rule the product is built on.",
      },
    ],
  },
  {
    version: "0.7",
    date: "17 September 2026",
    summary:
      "A template step for adding work, because a craft tells you the vocabulary and not the shape of the work.",
    entries: [
      {
        kind: "added",
        text: "Four templates per craft. A case study and a design system are both design, and almost nothing they should be asked about is the same: one is judged on a decision and a task success number, the other on adoption across teams over years. Every craft gets a shipped shape, a system shape, a leadership shape and one more that fits it.",
      },
      {
        kind: "added",
        text: "Leadership and system templates for every craft. Those are the two shapes senior work usually takes, and they were the two a single per-craft form served worst.",
      },
      {
        kind: "changed",
        text: "The template step only appears once a craft is chosen, so the page never asks two unanswered questions at once. You can switch template inside the editor without losing anything already typed.",
      },
      {
        kind: "added",
        text: "Case studies carry the kind of work they are next to the craft, so a reader can tell a platform build from an incident writeup before reading a word.",
      },
      {
        kind: "added",
        text: "Chapters of a case study now arrive as you reach them, and a thin progress bar says how much is left. Case studies run long on purpose. Everything stops under reduced motion.",
      },
    ],
  },
  {
    version: "0.6",
    date: "16 September 2026",
    summary:
      "Images inside case studies, a getting started checklist, and two layering bugs that made the join form unusable.",
    entries: [
      {
        kind: "added",
        text: "Figures inside a case study, placed under the chapter they belong to rather than in a gallery at the top. Alt text and a caption are required, because an uncaptioned screenshot is decoration and this product exists to stop decoration winning.",
      },
      {
        kind: "added",
        text: "Layout is chosen from the image rather than from a preference. A wide screenshot gets the full column, a phone screen gets a narrow one with its caption alongside, two under one heading sit side by side because two is almost always a before and after, and three or more become a grid.",
      },
      {
        kind: "added",
        text: "A slider, as an opt-in for a sequence. It stays off by default because a slider hides everything past the first slide, which is right for steps and wrong for evidence meant to be compared. It never auto advances.",
      },
      {
        kind: "added",
        text: "A getting started checklist in the panel, aimed at one published entry rather than a finished profile. It opens with signup already ticked, gives one action at a time, and can be dismissed and brought back.",
      },
      {
        kind: "added",
        text: "The editor now says what is still missing to publish while you write, instead of handing you a wall of errors after you have written a case study.",
      },
      {
        kind: "added",
        text: "A published example from the same kind of work, alongside the empty form. Nothing is copied into your fields: the value of this product is that a person answered the questions themselves.",
      },
      {
        kind: "added",
        text: "Links to where else someone can be found, chosen by craft. A developer's GitHub carries weight their Instagram does not, and for a designer it is the other way round.",
      },
      {
        kind: "fixed",
        text: "The craft dropdown inside the join form could not be opened at all, which made it impossible to create a profile. It was closing itself on any ancestor scroll, and opening it moved focus, which scrolled the form, which closed it in the same instant.",
      },
      {
        kind: "fixed",
        text: "The same dropdown then opened several hundred pixels away from its own field. A finished entrance animation leaves a transform behind, and that is enough to change what a floating panel positions itself against.",
      },
      {
        kind: "fixed",
        text: "Pressing Escape to close a dropdown also closed the whole dialog, taking a half filled form with it.",
      },
    ],
  },
  {
    version: "0.5",
    date: "15 September 2026",
    summary:
      "The directory is Southeast Asia now, and the case studies are written from it rather than translated into it.",
    entries: [
      {
        kind: "changed",
        text: "Forty people and fifty four case studies across Indonesia, Singapore, Vietnam, Malaysia, Thailand, the Philippines, Cambodia and Myanmar. A directory that is thin everywhere is worth less than one that is dense somewhere.",
      },
      {
        kind: "added",
        text: "Work written from the region rather than about it: same day QRIS settlement for a warung that cannot trade on money two days away, two incompatible Burmese encodings producing undeliverable addresses, freight routing where the road is a ferry with a timetable, and a Ramadan campaign that had been firing at sellers during their busiest weeks for three years.",
      },
      {
        kind: "fixed",
        text: "Directory cards were clipping their own content on a narrow screen.",
      },
    ],
  },
  {
    version: "0.4",
    date: "13 September 2026",
    summary:
      "Two filters that describe the person rather than the work, and a pass over the copy and the type hierarchy.",
    entries: [
      {
        kind: "changed",
        text: "Every filter takes more than one value. Within a facet the values are OR-ed, so asking for Designer and Developer returns both; across facets everything is AND-ed, so each one still narrows. The list stays open while you pick.",
      },
      {
        kind: "changed",
        text: "Practice left the topic dropdown and became a control of its own, next to Industry. They still share one field on an entry, so the quota is untouched, but an industry and a practice answer different questions and picking one is not a vote against the other.",
      },
      {
        kind: "changed",
        text: "The whole portfolio card is the link now, not just the small action in its corner. Skill chips keep their own click, so tapping one still filters rather than opening the entry.",
      },
      {
        kind: "changed",
        text: "Every dropdown is now a real listbox rather than the browser's own menu, and any list past six options carries a filter you can type into. Twenty-seven languages behind a native select was a scrolling exercise.",
      },
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
