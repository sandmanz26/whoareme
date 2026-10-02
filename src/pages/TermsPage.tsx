import { PageIntro, Prose, Section } from "@/components/layout/PageIntro"

/**
 * Terms, written for the one risk this product actually creates.
 *
 * Most portfolio sites host pictures. This one asks people to publish the
 * number that changed, which is frequently the exact thing their employment
 * contract or a client NDA covers. That is not a footnote; it is the first
 * clause after the basics, and the authoring form repeats it at the point
 * where someone is about to type a figure.
 *
 * Not legal advice, and it says so. A real launch needs a lawyer to read this
 * against the jurisdictions it operates in.
 */
export function TermsPage() {
  return (
    <div>
      <PageIntro
        eyebrow="Terms"
        title="The deal, in plain terms"
        lede="What you agree to by publishing here, what we agree to, and the one risk this product creates that most portfolio sites do not."
        meta="Version 0.1 · 18 September 2026 · a draft for an unreleased product, not reviewed by a lawyer"
      />

      <Prose>
        <Section title="Who this is between">
          <p>
            "We" is whoever operates whoareyou. "You" is the person using it. Using the directory,
            or publishing anything on it, means these terms apply to you. If you do not accept them,
            do not publish.
          </p>
          <p>
            This is a pre-release build. It runs in your browser with no account server, so at the
            moment there is no service to suspend and no data of yours held anywhere but your own
            device. These terms describe the service as it is intended to operate, and we will say
            plainly when that changes.
          </p>
        </Section>

        <Section title="Confidentiality is yours to check, and it matters more here">
          <p>
            This product asks for a result. A figure, a before and after, a number that moved. That
            is frequently the precise thing an employment contract, a client agreement or an NDA
            treats as confidential, and a metric is often more sensitive than a screenshot, not
            less.
          </p>
          <p>
            <strong className="font-semibold text-ink">
              You warrant that everything you publish is yours to publish.
            </strong>{" "}
            That means: you did the work you describe, you are entitled to describe it, and nothing
            you post breaches a duty of confidence you owe to anyone. If you are unsure whether a
            figure is covered, the answer is to get it in writing from whoever owns it, or to
            publish the shape of the result without the number. An entry with "cut a four-hour job
            to under an hour" is still evidence. An entry that quietly leaks your employer's
            conversion rate is a problem you will own, not us.
          </p>
          <p>
            If a claim is made against us because of something you published, you agree to cover the
            cost of defending it. We would rather never rely on that clause, which is why the
            authoring form warns you before you type a figure.
          </p>
        </Section>

        <Section title="Results are claimed, never verified">
          <p>
            Every figure on this site is a claim by the person who wrote it. We do not audit,
            confirm or endorse any of it, and the interface labels it as claimed everywhere it
            appears. Do not treat an entry here as a reference check. If you are hiring on the
            strength of a number, ask the person for the source.
          </p>
          <p>
            Knowingly publishing a false result is a breach of these terms and grounds for removing
            the entry and the profile.
          </p>
        </Section>

        <Section title="What you keep, and what you let us do">
          <p>
            Your work stays yours. Publishing here grants us a non-exclusive licence to host,
            display and reformat your entries so they render across devices, appear in search
            results on the site, and can be linked to. Nothing more: we do not sell your content,
            train models on it, or licence it onward.
          </p>
          <p>
            You can unpublish an entry at any time, which removes it from the directory, or delete
            your profile, which removes everything. There is no retention period and no copy kept
            for our own purposes, with one exception named below.
          </p>
        </Section>

        <Section title="Moderation, and your right to argue with it">
          <p>
            We remove entries and suspend profiles. The grounds are in the{" "}
            <a
              href="/content-policy"
              className="font-display font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-200 hover:decoration-pop-pink"
            >
              content policy
            </a>
            . Two commitments attach to every decision:
          </p>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              You get the reason. Not a category, the actual reason a person wrote when they made
              the decision.
            </li>
            <li>
              You can contest it, and a person who did not take the original decision reviews it.
            </li>
          </ul>
          <p>
            The record of moderation decisions is the one thing we keep after you delete your
            profile, and we keep it in the narrowest form that still works: the decision, the
            reason, and the date. It exists so moderation can be held to account, which is not
            possible if the log can be erased by the party it concerns.
          </p>
        </Section>

        <Section title="No promise of uptime, and no liability for what you decide">
          <p>
            The service is provided as it is. We do not guarantee it stays available, that entries
            remain reachable, or that it suits any particular purpose. We are not liable for
            decisions you take on the strength of something you read here, including hiring
            decisions.
          </p>
          <p>
            Nothing in these terms limits liability where the law does not allow it to be limited.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We will change these terms. When a change affects what you may publish or how moderation
            works, we will say so on the{" "}
            <a
              href="/changelog"
              className="font-display font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-200 hover:decoration-pop-pink"
            >
              changelog
            </a>{" "}
            rather than quietly reissuing the page and relying on you to diff it.
          </p>
        </Section>
      </Prose>
    </div>
  )
}
