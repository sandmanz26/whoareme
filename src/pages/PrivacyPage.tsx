import { PageIntro, Prose, Section } from "@/components/layout/PageIntro"

const STORAGE_KEYS = [
  {
    key: "whoareyou:account",
    holds: "Your name, title, location, years of experience, craft and topics - whatever you typed into the join form and the profile panel.",
  },
  {
    key: "whoareyou:drafts",
    holds: "Every portfolio entry you have written, published or not, including any cover image you uploaded (downscaled to 960px and stored as text inside this key).",
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
        lede="In this build: nowhere. There is no account server, no analytics, and no request that carries anything you typed. That is a property of how it is built, not a promise we are asking you to take on trust."
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
            Signing out clears all three. There is no separate deletion request to make, because
            there is nobody to make it to.
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
            Seeded profile portraits are loaded from <code>randomuser.me</code>, which means your
            browser makes a request to that domain and it can see your IP address and user agent
            the way any image host would. Nothing identifying you is attached to those requests.
            If the images fail to load - offline, blocked, or an ad blocker - the interface falls
            back to a tinted monogram and works normally.
          </p>
          <p>
            There are no analytics scripts, no tag managers, no advertising pixels and no cookies.
            The site sets no cookie at all.
          </p>
        </Section>

        <Section title="What would change with a real backend">
          <p>
            The repository contains an API that this interface is not yet using. Stating its design
            now, so the change is not a surprise later: passwords would be stored only as scrypt
            hashes; refresh tokens would be stored only as SHA-256 digests, so a database leak
            would not hand over live sessions; and traffic de-duplication would use a salted daily
            hash of IP and user agent that identifies nobody and is rotated every day so it cannot
            be joined across dates.
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
