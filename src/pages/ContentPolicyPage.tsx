import { PageIntro, Prose, Section } from "@/components/layout/PageIntro"
import { Badge } from "@/components/ui/Badge"

const REMOVED = [
  {
    what: "A result that is not true",
    why: "The whole product rests on entries stating something real. An invented figure is not an exaggeration here, it is the thing we exist to prevent.",
  },
  {
    what: "Work that is not yours",
    why: "Describing a team's work as your own, or a colleague's decision as your call. Claiming a share of something is fine; claiming the whole of it is not.",
  },
  {
    what: "Confidential material",
    why: "Figures, documents or screenshots you were not free to publish. We act on a credible report from the party it belongs to without waiting for a court.",
  },
  {
    what: "Anything about a person who did not consent",
    why: "Naming a colleague as the cause of a failure, or publishing someone else's performance data. Describe decisions, not people.",
  },
  {
    what: "Spam and advertising",
    why: "Entries whose purpose is a link. A directory of real work stops being useful the moment it becomes a placement channel.",
  },
]

const NOT_REMOVED = [
  {
    what: "Work that failed",
    why: "Cancelled projects, accepted regressions, migrations stopped halfway. A portfolio where everything succeeded is not credible, and the seeded entries include several that did not.",
  },
  {
    what: "A result someone disputes",
    why: "Two people can honestly remember a project differently. A dispute is a reason to ask for the source, not to remove the entry.",
  },
  {
    what: "Unflattering detail about a company",
    why: "\"The estimate tripled and we stopped\" is a fact about a project. Criticism is not defamation, and we do not remove entries because a company would prefer they were gone.",
  },
  {
    what: "A thin entry",
    why: "Being unconvincing is not a violation. The form nudges, the completeness meter nudges, and then it is your call.",
  },
]

/**
 * The content policy exists because the moderation console does.
 *
 * Every hosting provider has to publish the grounds on which it removes
 * things, give the affected person a reason, and offer a route to contest it -
 * and unlike most platform obligations, that one has no small-company
 * exemption. A console that can withhold someone's work without a published
 * policy behind it is the wrong way round.
 *
 * The "what we do not remove" half is doing as much work as the first: a
 * policy that only lists prohibitions reads as an invitation to complain about
 * anything.
 */
export function ContentPolicyPage() {
  return (
    <div>
      <PageIntro
        eyebrow="Content policy"
        title="What comes down, and what stays up"
        lede="The grounds we act on, the reasons we do not, and what happens when you disagree with a decision."
        meta="Version 0.1 · 18 September 2026 · a draft for an unreleased product, not reviewed by a lawyer"
      />

      <Prose>
        <Section title="What gets removed">
          <dl className="flex flex-col gap-5">
            {REMOVED.map((item) => (
              <div key={item.what} className="border-t border-line pt-4">
                <dt className="flex flex-wrap items-center gap-2">
                  <Badge className="border-ink/20 bg-pop-pink">Removed</Badge>
                  <span className="font-display text-base font-semibold text-ink">{item.what}</span>
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">{item.why}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="What does not get removed">
          <p>
            A policy that only lists prohibitions invites a complaint about anything. These are the
            reports we expect to receive and decline.
          </p>
          <dl className="flex flex-col gap-5">
            {NOT_REMOVED.map((item) => (
              <div key={item.what} className="border-t border-line pt-4">
                <dt className="flex flex-wrap items-center gap-2">
                  <Badge className="border-ink/20 bg-pop-lime">Stays up</Badge>
                  <span className="font-display text-base font-semibold text-ink">{item.what}</span>
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">{item.why}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="How to report something">
          <p>
            Every case study and every profile carries a <strong className="font-semibold text-ink">
              Report this
            </strong>{" "}
            link. No account is needed: the reports worth having often come from someone who
            happens to know a claim is false, and requiring them to sign up first would mean we
            never hear it.
          </p>
          <p>
            Tell us which part is wrong and why. "The headline figure does not match the outcome
            text" is actionable. "This is bad" is not.
          </p>
        </Section>

        <Section title="What we do with it">
          <p>
            A person reads it. Rule-based checks flag things too - entries with no evidence,
            placeholder links, quota breaches - but a flag is a prompt to look, never a decision on
            its own, and nothing is removed automatically.
          </p>
          <p>
            When we act, the author gets the reason a moderator wrote at the time, not a category
            code. Every decision is recorded with that reason, and the record outlives the entry it
            concerns, because moderation nobody can audit is not moderation.
          </p>
        </Section>

        <Section title="If you disagree">
          <p>
            Reply to the notice and a different person reviews it. Not the moderator who took the
            decision, and not a form that closes itself. If the review overturns the decision, the
            entry goes back up with its original date and the reversal is recorded next to the
            original.
          </p>
          <p>
            We will publish how often that happens. A platform that never overturns itself is not
            careful, it is unaccountable.
          </p>
        </Section>

        <Section title="Where this is honest about itself">
          <p>
            In this pre-release build the console has no access control, decisions live in one
            browser, and there is no mail transport to send a notice with. The appeal route
            described above is the intended behaviour, not a shipped feature. It is written down
            here because the policy has to exist before the power to remove things does, not after.
          </p>
        </Section>
      </Prose>
    </div>
  )
}
