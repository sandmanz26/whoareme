import { PageIntro, Prose, Section } from "@/components/layout/PageIntro"
import { Badge } from "@/components/ui/Badge"

const DONE = [
  "Every control is reachable and operable by keyboard, including the dropdowns, the dialog and the moderation console.",
  "The dialog traps focus, restores it on close, and closes on Escape.",
  "Dropdowns are a real combobox: `role=\"combobox\"` on the trigger, `role=\"listbox\"` on the popover, arrow keys, Home and End, type-ahead filtering above six options.",
  "Form and filter controls carry visible labels, not placeholder text standing in for one.",
  "Errors are announced through `role=\"alert\"` and tied to their field with `aria-describedby`.",
  "Text contrast was fixed at the ramp rather than the palette, and a CI check stops it regressing.",
  "All motion stops under `prefers-reduced-motion`, through one global rule.",
  "No horizontal scrolling at 360, 390, 768, 1024 or 1440 pixels wide, checked on every route.",
  "Portraits degrade to a tinted monogram rather than a broken image, so a failed request never removes information.",
]

const NOT_DONE = [
  {
    what: "No audit by a disabled user",
    detail:
      "Everything above was checked by a developer against a specification. That is not the same as someone who uses a screen reader every day trying to publish an entry, and the difference is usually where the real problems are.",
  },
  {
    what: "Generated case study covers are decorative",
    detail:
      "They carry the headline figure as text in the DOM, so the number is available. The drawn motif behind it is not described, because describing a line pattern would add noise rather than information.",
  },
  {
    what: "The orbiting portraits on the home page",
    detail:
      "Announced as decorative and stopped under reduced motion. They are still a moving element behind a heading, which some people find uncomfortable even when it is technically compliant.",
  },
  {
    what: "No formal conformance claim",
    detail:
      "We have not run a full WCAG 2.2 AA audit, so we are not claiming conformance. Saying \"WCAG AA compliant\" without the audit behind it is the kind of statement this product exists to argue against.",
  },
]

/**
 * An accessibility statement that is a report, not a badge.
 *
 * The honest version of this page names what has not been done. A product
 * whose whole pitch is "state the result, do not imply it" cannot then claim
 * conformance it has not tested for.
 */
export function AccessibilityPage() {
  return (
    <div>
      <PageIntro
        eyebrow="Accessibility"
        title="What works, and what we have not tested"
        lede="The target is WCAG 2.2 AA, the level EN 301 549 points at. This page says how far we have got and where we know we fall short."
        meta="Last reviewed 18 September 2026 · no formal conformance claim"
      />

      <Prose>
        <Section title="What is in place">
          <ul className="flex list-disc flex-col gap-2.5 pl-5">
            {DONE.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-ink-2">
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Known gaps">
          <dl className="flex flex-col gap-5">
            {NOT_DONE.map((item) => (
              <div key={item.what} className="border-t border-line pt-4">
                <dt className="flex flex-wrap items-center gap-2">
                  <Badge className="border-ink/20 bg-pop-tangerine">Gap</Badge>
                  <span className="font-display text-base font-semibold text-ink">{item.what}</span>
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="The standard we are aiming at">
          <p>
            EN 301 549 is the European standard that accessibility law points to, and it tracks
            WCAG: version 4.1.1, published in September 2026, moves it to WCAG 2.2. We are building
            against WCAG 2.2 AA rather than 2.1, because designing to the version being superseded
            is work that has to be redone.
          </p>
          <p>
            Accessibility here is also a product argument, not only a legal one. This directory
            exists so that work which does not photograph well is not second-class. A person who
            cannot use the form to publish it is excluded by exactly the mechanism the product
            claims to fix.
          </p>
        </Section>

        <Section title="Telling us something is wrong">
          <p>
            Accessibility problems are bugs and are treated as bugs, not as feature requests. If
            something blocks you, say what you were trying to do, what happened, and what you were
            using: browser, screen reader or other assistive technology, and version. That is
            usually enough to reproduce it.
          </p>
          <p>
            Our contact address is in the footer. In this pre-release build there is no mail
            transport wired up, so the honest position is that the address works and the response
            time on this page is an intention rather than a record.
          </p>
        </Section>
      </Prose>
    </div>
  )
}
