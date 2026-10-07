import { PageIntro, Prose, Section } from "@/components/layout/PageIntro"
import { useAdmin } from "@/hooks/useAdmin"

const linkClass =
  "font-display font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-200 hover:decoration-pop-pink"

/**
 * The privacy page is a data map, not a promise.
 *
 * The product asks people to publish numbers that are often contractual, so a
 * vague "we care about your privacy" is the wrong register. This page lists
 * what is stored, where it lives, who else sees it, and exactly what deleting
 * the account removes - including the one exception, because an honest page
 * names the exception rather than burying it.
 */
export function PrivacyPage() {
  const { state } = useAdmin()
  const contact = state.contact

  return (
    <div>
      <PageIntro
        eyebrow="Privacy"
        title="Where your data actually goes"
        lede="This build has an account server. Your profile, your entries and your traffic live in our database, not only in your browser. This is the specific list: what we hold, why, and what deleting your account removes."
        meta="Last updated 8 October 2026"
      />

      <Prose>
        <Section title="What we hold about you">
          <p>
            When you create an account we store what a directory needs: your name, email address,
            craft, title, company, city and country, years of experience, working languages, topics,
            skills, whether you are open to work, your portfolio link, your bio and an optional
            portrait. Your password is stored only as a bcrypt hash. The password itself is never
            written down. Your email is used for verification and password resets, and for nothing
            else.
          </p>
          <p>
            Each entry you publish is stored in full, together with a snapshot of the public parts
            of your profile (name, title, company, portrait, years, languages) so a card can render
            without a second lookup. Editing your profile refreshes those snapshots.
          </p>
        </Section>

        <Section title="Images you upload">
          <p>
            A portrait or an entry thumbnail you upload is written to our server as a file and
            served from this API. It is not re-encoded on the server beyond the downscale your
            browser does before upload. Removing the entry, or deleting your account, deletes the
            file.
          </p>
        </Section>

        <Section title="Traffic, without tracking you">
          <p>
            The traffic panel counts profile views and entry opens. It is built so it cannot
            identify a person. A view is de-duplicated with a salted hash of your IP address and
            user agent, computed for one day only: the salt rotates daily, so the same visitor on
            two days cannot be joined up, and the hash is never shown to anyone. The counts are
            visible only to the person they belong to. There is no endpoint, and no plan for one,
            that shows you another person's numbers.
          </p>
          <p>
            The funnel counters that tell us whether people finish publishing a first entry are
            narrower still: a named step and a number, with no identifier and no timestamp per
            event. Two people who publish an entry are indistinguishable in that data, which is the
            point. The question is "do people finish", not "did this person finish".
          </p>
        </Section>

        <Section title="What stays in your browser">
          <p>
            Signing in stores a session token in your browser's <code>localStorage</code>, so you
            stay signed in across reloads. A small flag remembers that you dismissed the onboarding
            checklist, and the funnel counters above are kept per browser until they are sent. We
            set no cookies at all.
          </p>
        </Section>

        <Section title="Who else sees anything">
          <p>
            Verification and password-reset emails are delivered by an email provider, which
            necessarily handles the address they are sent to. The seeded portrait images on the
            original demo profiles are served by <code>randomuser.me</code>, so your browser
            requests them from that domain. The two typefaces are served from this site, so no font
            request leaves it.
          </p>
          <p>
            There are no analytics scripts, no tag managers and no advertising pixels. Reports reach
            us with a reason, an optional note and a salted daily hash of the reporter's IP and user
            agent used only to stop duplicate spam. The report is not stored against the account
            that filed it.
          </p>
        </Section>

        <Section title="Moderation records">
          <p>
            When a moderator removes an entry or suspends a profile, we record the decision, the
            reason a person wrote at the time, and the date. That record is kept even after the
            content is gone, because moderation that cannot be audited is not moderation. The notice
            that explained the decision to you is deleted with your account. The decision itself is
            the one thing that outlives it.
          </p>
        </Section>

        <Section title="Deleting your account">
          <p>
            Deleting your profile removes your account, the entries you published, the images you
            uploaded, your traffic history and your notices. The only thing that survives is the
            moderation decision record described above, which keeps the decision, the reason and the
            date, and none of your profile.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about any of this, including a data request, go to{" "}
            <a href={`mailto:${contact.email}`} className={linkClass}>
              {contact.email}
            </a>
            . {contact.responseTime}
          </p>
        </Section>
      </Prose>
    </div>
  )
}
