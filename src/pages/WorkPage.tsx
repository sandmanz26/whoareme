import { Container } from "@/components/layout/Container"
import { Avatar } from "@/components/ui/Avatar"
import { SocialLinks } from "@/components/ui/SocialLinks"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { ArrowRight, ArrowUpRight, Pin } from "@/components/ui/Icon"
import { WorkCover } from "@/components/work/WorkCover"
import { WorkFigures } from "@/components/work/WorkFigures"
import { Reveal } from "@/components/work/Reveal"
import { useReadingProgress } from "@/hooks/useReveal"
import { templateById } from "@/data/workTemplates"
import { WorkCard } from "@/components/work/WorkCard"
import { headlineProof, proofOf, type Work, type WorkFigure } from "@/data/work"
import { figuresFor, orphanFigures } from "@/lib/figures"
import { categoryById, roleById } from "@/data/taxonomy"
import type { Author } from "@/lib/authors"
import { navigate } from "@/lib/router"
import { businessModelById } from "@/data/businessModels"
import type { SimilarWork } from "@/lib/similar"
import type { Target } from "@/data/admin"
import { ReportButton } from "@/components/admin/ReportModal"
import { useAccount } from "@/hooks/useAccount"
import { opensByWork } from "@/data/traffic"
import { Chart } from "@/components/ui/Icon"

interface WorkPageProps {
  work: Work | undefined
  authors: Map<string, Author>
  /** Other entries by the same person, newest first. */
  moreByAuthor: Work[]
  /** Scored by shared skills, topic and business model. */
  similar: SimilarWork[]
  /** Clicking a skill filters the index rather than doing nothing. */
  onSkillClick: (skill: string) => void
  /** Opens the report dialog for this entry. */
  onReport: (target: Target, label: string) => void
}

/**
 * A chapter heading is the spine of a case study, so it is a real heading.
 * Rendering every one of them as a tiny uppercase micro-label gave the page a
 * flat, templated rhythm where the reader could not tell the argument from the
 * metadata.
 */
function Chapter({
  title,
  body,
  figures = [],
  delay = 0,
}: {
  title: string
  body: string
  figures?: readonly WorkFigure[]
  delay?: number
}) {
  // A chapter with figures but no prose is still worth rendering - the caption
  // carries the argument. A chapter with neither is not.
  if (!body.trim() && figures.length === 0) return null
  return (
    <Reveal delay={delay}>
      <section>
        <h2 className="display text-[clamp(1.25rem,2.4vw,1.625rem)]">{title}</h2>
        {body.trim() && <p className="mt-4 text-base leading-[1.75] text-ink-2">{body}</p>}
        <WorkFigures figures={figures} />
      </section>
    </Reveal>
  )
}

export function WorkPage({
  work,
  authors,
  moreByAuthor,
  similar,
  onSkillClick,
  onReport,
}: WorkPageProps) {
  const { ref: progressRef, progress } = useReadingProgress<HTMLElement>()
  const { account, traffic } = useAccount()

  if (!work) {
    return (
      <Container className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <h1 className="display text-3xl">Case study not found</h1>
        <p className="mt-3 max-w-sm text-sm text-muted">
          The link may be stale, or the entry was removed from the directory.
        </p>
        <Button className="mt-7" onClick={() => navigate("/work")}>
          Browse all portfolios
        </Button>
      </Container>
    )
  }

  const author = authors.get(work.authorId)
  // Traffic is the author's own data. There is no view of anyone else's, here
  // or in the API, and no public count on the card: a popularity number is the
  // ranking signal this directory deliberately does not have.
  const isMine = account?.id === work.authorId
  const opens = isMine ? (opensByWork(traffic)[work.id] ?? 0) : null
  const headline = headlineProof(work)
  const proof = proofOf(work)
  const context = work.details.filter((detail) => !detail.proof)
  const chapterNames =
    work.sections && work.sections.length > 0
      ? work.sections.map((section) => section.heading)
      : ["problem", "approach", "outcome"]
  const orphans = orphanFigures(work, chapterNames)
  const template = templateById(work.template)

  return (
    <article ref={progressRef} className="pb-24">
      {/* A case study runs long on purpose. The bar is the cheapest way to say
          how much is left, and it is the only motion on the page that is not
          an entrance. */}
      <div
        aria-hidden="true"
        className="sticky top-16 z-30 h-0.5 w-full bg-transparent sm:top-18"
      >
        <div
          className="h-full origin-left bg-ink transition-transform duration-150 ease-linear"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* Two ways back, because a reader arrives here by two routes: from a
          grid of everyone's work, or from one person's profile. Offering only
          "all portfolios" loses the reader who was halfway through reading a
          person. The author link is first because it is the more specific
          destination. */}
      <Container className="flex flex-wrap items-center gap-x-1 gap-y-1 pt-8">
        {author && (
          <>
            <button
              type="button"
              onClick={() => navigate(`/people/${author.id}`)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill py-2 font-display text-sm font-medium text-muted transition-colors duration-200 hover:text-ink"
            >
              <ArrowRight size={16} className="rotate-180" />
              {author.isViewer ? "Your profile" : author.name}
            </button>
            <span aria-hidden="true" className="px-1 text-sm text-muted/50">
              ·
            </span>
          </>
        )}
        <button
          type="button"
          onClick={() => navigate("/work")}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill py-2 font-display text-sm font-medium text-muted transition-colors duration-200 hover:text-ink"
        >
          {!author && <ArrowRight size={16} className="rotate-180" />}
          All portfolios
        </button>
      </Container>

      <Container className="mt-4">
        {work.thumbnail ? (
          <div className="relative h-52 w-full overflow-hidden rounded-card sm:h-72">
            <img src={work.thumbnail} alt="" className="size-full object-cover" />
            {headline && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent p-6 pt-16 text-paper">
                <p className="display text-[clamp(1.5rem,3.5vw,2.25rem)] leading-[1.05]">
                  {headline.value}
                </p>
                <p className="mt-1.5 font-display text-[0.6875rem] font-medium tracking-[0.16em] uppercase opacity-75">
                  {headline.label}
                </p>
              </div>
            )}
          </div>
        ) : (
          <WorkCover
            seed={work.id}
            role={work.role}
            metric={headline?.value}
            metricLabel={headline?.label}
            className="h-52 w-full rounded-card sm:h-72"
          />
        )}
      </Container>

      <Container className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-10">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-ink/20 bg-paper-2">{roleById(work.role).label}</Badge>
              {template && <Badge className="border-dashed">{template.label}</Badge>}
              {work.topics.map((topic) => (
                <Badge key={topic}>{categoryById(topic).label}</Badge>
              ))}
            </div>
            <h1 className="display mt-5 text-[clamp(2rem,5vw,3.25rem)]">{work.title}</h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{work.summary}</p>

            {work.skills.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {work.skills.map((skill) => (
                  <li key={skill}>
                    <button
                      type="button"
                      onClick={() => onSkillClick?.(skill)}
                      className="inline-flex min-h-10 cursor-pointer items-center rounded-pill border border-line bg-card px-3.5 font-display text-xs font-medium text-ink-2 transition-colors duration-200 hover:border-ink hover:text-ink"
                    >
                      {skill}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </header>

          {/* Guided entries get the three fixed chapters; free-form entries
              bring their own headings in their own order. */}
          {work.sections && work.sections.length > 0 ? (
            work.sections.map((section, index) => (
              <Chapter
                key={section.heading}
                title={section.heading}
                body={section.body}
                figures={figuresFor(work, section.heading)}
                delay={Math.min(index, 3) * 60}
              />
            ))
          ) : (
            <>
              <Chapter
                title="The problem"
                body={work.problem}
                figures={figuresFor(work, "problem")}
              />
              <Chapter
                title="What they did"
                body={work.approach}
                figures={figuresFor(work, "approach")}
                delay={60}
              />
              <Chapter
                title="What changed"
                body={work.outcome}
                figures={figuresFor(work, "outcome")}
                delay={120}
              />
            </>
          )}

          {/* A figure whose chapter was renamed would otherwise vanish. */}
          {orphans.length > 0 && (
            <section>
              <h2 className="display text-[clamp(1.25rem,2.4vw,1.625rem)]">More evidence</h2>
              <WorkFigures figures={orphans} />
            </section>
          )}

          {context.length > 0 && (
            <section>
              <h2 className="display text-[clamp(1.25rem,2.4vw,1.625rem)]">Details</h2>
              <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {context.map((detail) => (
                  <div key={detail.label} className="border-t border-line pt-3">
                    <dt className="font-display text-xs font-medium tracking-wide text-muted">
                      {detail.label}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-ink">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        {/* Sidebar: the parts a reviewer scans before reading a word. */}
        <aside className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
          {author && (
            <div className="rounded-card border border-line bg-card p-5">
              <button
                type="button"
                onClick={() => navigate(`/people/${author.id}`)}
                className="group flex w-full cursor-pointer items-start gap-3.5 text-left"
              >
                <Avatar
                  src={author.photo}
                  name={author.name}
                  className="size-12 shrink-0 rounded-[30%] border border-ink/10 bg-paper-2"
                />
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold text-ink transition-colors duration-200 group-hover:text-pop-violet">
                    {author.name}
                    {author.isViewer && <span className="ml-1 text-muted">· you</span>}
                  </p>
                  <p className="truncate text-sm text-ink-2">{author.title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <Pin size={12} />
                    <span className="truncate">
                      {author.company} · {author.location}
                    </span>
                  </p>
                </div>
                <ArrowUpRight
                  size={15}
                  className="ml-auto shrink-0 text-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                />
              </button>
              {author.links.length > 0 && (
                <SocialLinks
                  links={author.links}
                  ownerName={author.name}
                  className="mt-4 border-t border-line pt-4"
                />
              )}

              <p className="mt-3 text-xs text-muted">
                See the rest of their portfolio, grouped by topic.
              </p>
            </div>
          )}

          {proof.length > 0 && (
            <div className="rounded-card border border-ink bg-ink p-5 text-paper">
              <h2 className="eyebrow text-paper/50">Results claimed</h2>
              <dl className="mt-4 space-y-4">
                {proof.map((detail) => (
                  <div key={detail.label}>
                    <dt className="font-display text-[0.6875rem] font-medium tracking-[0.14em] uppercase text-pop-lime">
                      {detail.label}
                    </dt>
                    <dd className="mt-1 font-display text-base leading-snug font-semibold">
                      {detail.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="rounded-card border border-line bg-card p-5">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Year</dt>
                <dd className="font-display font-medium text-ink">{work.year}</dd>
              </div>
              {work.duration && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Duration</dt>
                  <dd className="font-display font-medium text-ink">{work.duration}</dd>
                </div>
              )}
              {work.model && (
                <div className="flex justify-between gap-4 text-right">
                  <dt className="shrink-0 text-muted">Business model</dt>
                  <dd className="font-display font-medium text-ink">
                    {businessModelById(work.model)?.label}
                  </dd>
                </div>
              )}
              {work.scope && (
                <div className="flex justify-between gap-4 text-right">
                  <dt className="shrink-0 text-muted">Scope</dt>
                  <dd className="font-display font-medium text-ink">{work.scope}</dd>
                </div>
              )}
            </dl>

            {work.stack.length > 0 && (
              <>
                <ul className="mt-5 flex flex-wrap gap-1.5 border-t border-line pt-5">
                  {work.stack.map((item, index) => (
                    <li key={`${item}-${index}`}>
                      <Badge>{item}</Badge>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {work.links.length > 0 && (
              <>
                <ul className="mt-5 space-y-2 border-t border-line pt-5">
                  {work.links.map((link, index) => (
                    <li key={`${link.href}-${index}`}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 font-display text-sm font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-200 hover:decoration-pop-pink"
                      >
                        {link.label}
                        <ArrowUpRight size={14} />
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {opens !== null && (
            <div className="rounded-card border border-line bg-paper-2/60 p-5">
              <h2 className="eyebrow">Your numbers</h2>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="display text-3xl leading-none">{opens}</span>
                <span className="font-display text-sm text-muted">
                  {opens === 1 ? "open" : "opens"}
                </span>
              </p>
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted">
                <Chart size={14} className="mt-0.5 shrink-0" />
                <span>
                  Only you see this. The history was generated when you signed up, and real opens
                  in this browser are counted on top of it.
                </span>
              </p>
            </div>
          )}

          <p className="text-center">
            <ReportButton
              onClick={() => onReport({ kind: "work", id: work.id }, work.title)}
            />
          </p>
        </aside>
      </Container>

      {moreByAuthor.length > 0 && author && (
        <Container className="mt-20 border-t border-line pt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="display text-2xl">More from {author.name}</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/people/${author.id}`)}
              className="inline-flex cursor-pointer items-center gap-1.5 font-display text-sm font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-200 hover:decoration-pop-pink"
            >
              Full profile
              <ArrowUpRight size={15} />
            </button>
          </div>

          <ul className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {moreByAuthor.map((item, index) => (
              <li key={item.id} className="flex min-w-0">
                <WorkCard work={item} author={authors.get(item.authorId)} index={index} />
              </li>
            ))}
          </ul>
        </Container>
      )}

      {similar.length > 0 && (
        <Container className="mt-20 border-t border-line pt-12">
          <h2 className="display text-2xl">
            Similar <span className="text-muted">by skills, topic and business model</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Not "looks alike" - matched on the things that make two projects actually comparable.
            Each card says why it surfaced.
          </p>

          <ul className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {similar.map((match, index) => (
              <li key={match.work.id} className="flex min-w-0 flex-col">
                <WorkCard
                  work={match.work}
                  author={authors.get(match.work.authorId)}
                  index={index}
                />
                <p className="mt-2 flex flex-wrap items-center gap-1.5 px-1 text-xs text-muted">
                  <span className="font-display font-medium text-ink-2">Shared:</span>
                  {match.reasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-pill bg-paper-2 px-2 py-0.5 font-display text-[0.6875rem] text-ink-2"
                    >
                      {reason}
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      )}
    </article>
  )
}
