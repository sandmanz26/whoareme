import { PageIntro, Prose, Section } from "@/components/layout/PageIntro"

const STORAGE_KEYS = [
  {
    key: "whoareyou:account",
    holds:
      "Your name, title, location, years of experience, craft, topics, portrait and bio - whatever you typed into the sign-up form and the profile panel, plus a PBKDF2 hash of your password. The password itself is never stored.",
  },
  {
    key: "whoareyou:drafts",
    holds:
      "Every portfolio entry you have written, published or not, including any cover image you uploaded (downscaled to 960px and stored as text inside this key).",
  },
  {
    key: "whoareyou:funnel",
    holds:
      "Counters for named steps, such as how many times the entry form was opened and how many entries were published. No identifier, no timestamps, no paths. It records that a step happened, never who did it.",
  },
  {
    key: "whoareyou:session",
    holds: "A single flag saying whether you are signed in. Nothing else.",
  },
  {
    key: "whoareyou:traffic",
    holds: "The generated view and open history shown in the traffic panel.",
  },
]

export function PrivacyPage() {
  return (
    <div>
      <PageIntro
        eyebrow="Privacy"
        title="Where your data actually goes"
        lede="In this build: nowhere. There is no account server and no request that carries anything you typed. That is a property of how it is built, not a promise we are asking you to take on trust."
        meta="Last updated 12 September 2026 · describes this front-end build specifically"
      />

      <Prose>
        <Section title="What is stored, and where">
          <p>
            Everything you create is written to your own browser’s <code>localStorage</code> under
            three keys. It never leaves the device, it is not synced between your browsers, and
            clearing your browser data deletes it permanently - there is no copy for us to restore.
          </p>
          <dl className="flex flex-col gap-4">
            {STORAGE_KEYS.map((item) => (
              <div key={item.key} className="border-t border-line pt-4">
                <dt className="font-display text-sm font-semibold text-ink">{item.key}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted">{item.holds}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted">
            Signing out ends the session and leaves all three in place, so you can sign back in.
            <strong className="font-semibold text-ink"> Delete profile</strong>, in the profile
            panel, removes them. There is no separate deletion request to make, because there is
            nobody to make it to.
          </p>
        </Section>

        <Section title="The traffic numbers are simulated">
          <p>
            The view and open counts in the panel are generated locally, and the panel says so on
            the screen itself. They are there to show what the surface would look like with real
            numbers in it. Nothing is being measured about you, and nothing about your browsing of
            this site is recorded anywhere.
          </p>
        </Section>

        <Section title="The one third-party request">
          <p>
            <code>randomuser.me</code> serves the seeded profile portraits, so your browser makes a
            request to that domain and it can see your IP address and user agent the way any image
            host would. Nothing identifying you is attached. If those images fail to load - offline,
            blocked, or an ad blocker - the interface falls back to a tinted monogram and works
            normally.
          </p>
          <p>
            The two typefaces used to come from the Google Fonts CDN, which meant every visitor's IP
            address reached a third party before the page rendered. They are now served from this
            site, so that request is gone.
          </p>
          <p>
            There are no analytics scripts, no tag managers, no advertising pixels and no cookies.
            The site sets no cookie at all. We do count how often a few named steps happen - the
            entry form opened, an entry published - because the one thing we need to know is whether
            people can finish. Those are counters in your own browser, not a record of your session:
            there is no identifier attached and no way to tell two people apart in them.
          </p>
        </Section>

        <Section title="What would change with a real backend">
          <p>
            The repository contains an API that this interface is not yet using. Stating its design
            now, so the change is not a surprise later: passwords would be stored only as scrypt
            hashes; refresh tokens would be stored only as SHA-256 digests, so a database leak would
            not hand over live sessions; and traffic de-duplication would use a salted daily hash of
            IP and user agent that identifies nobody and is rotated every day so it cannot be joined
            across dates.
          </p>
          <p>
            Traffic figures would remain visible only to the person they belong to. There is no
            endpoint, and no plan for one, that shows you another person’s numbers.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            This is a demonstration build and there is no data controller to write to. If you are
            evaluating it as a product, the honest summary is the first line of this page: in this
            build, your data does not go anywhere.
          </p>
        </Section>
      </Prose>
    </div>
  )
}
