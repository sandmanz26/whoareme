import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/Button"
import { ArrowRight } from "@/components/ui/Icon"
import { PEOPLE } from "@/data/people"
import { Avatar } from "@/components/ui/Avatar"

const STEPS = [
  {
    number: "01",
    title: "Tell us who you are",
    body: "Name, city, and the craft you want to be found for. Ninety seconds, no CV upload.",
  },
  {
    number: "02",
    title: "Pick your segments",
    body: "SaaS, AI, Banking, Leadership - tag the worlds you have actually shipped in.",
  },
  {
    number: "03",
    title: "Show the work",
    body: "Link the portfolio, repo or case study that makes the point better than a bullet list.",
  },
]

const FACES = PEOPLE.slice(16, 21)

export function JoinCta({ onJoin }: { onJoin: () => void }) {
  return (
    <section id="join" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-14 text-paper sm:px-12 sm:py-20">
          {/* Pop geometry - the only decoration on an otherwise silent block. */}
          <span
            aria-hidden="true"
            className="animate-float pointer-events-none absolute -top-32 -right-24 size-80 rounded-full bg-pop-violet/35 blur-[90px]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-pop-pink/25 blur-[90px]"
          />

          <div className="relative grid gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
            <div>
              <p className="eyebrow text-paper/50">Join the directory</p>
              <h2 className="display mt-4 text-[clamp(2.25rem,6vw,4rem)]">
                A portfolio
                <br />
                that argues
                <span className="text-pop-lime">.</span>
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-paper/70">
                The form asks what your craft actually gets asked: the problem, the calls you made,
                and what moved. Harder to fill in than a link list, which is the point. Free while
                we are in early access.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Button variant="pop" size="lg" onClick={onJoin}>
                  Publish your first entry
                  <ArrowRight size={18} />
                </Button>

                <div className="flex items-center gap-3">
                  <ul className="flex -space-x-2.5">
                    {FACES.map((person) => (
                      <li key={person.id}>
                        <Avatar
                          src={person.photo}
                          name={person.name}
                          decorative
                          className="size-9 rounded-full border-2 border-ink bg-ink-2"
                        />
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs leading-tight text-paper/60">
                    Joined this week
                    <br />
                    <span className="font-display font-medium text-paper">+128 profiles</span>
                  </p>
                </div>
              </div>
            </div>

            <ol className="flex flex-col gap-8">
              {STEPS.map((step) => (
                <li key={step.number} className="flex gap-5 border-b border-paper/10 pb-8 last:border-0 last:pb-0">
                  <span className="font-display text-sm font-semibold tracking-wide text-pop-lime">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-paper/60">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </section>
  )
}
