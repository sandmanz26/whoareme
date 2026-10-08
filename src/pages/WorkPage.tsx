import { useEffect, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Container } from "@/components/layout/Container"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { ArrowRight, ArrowUpRight } from "@/components/ui/Icon"
import { WorkCover } from "@/components/work/WorkCover"
import { WorkFigures } from "@/components/work/WorkFigures"
import { WorkCard } from "@/components/work/WorkCard"
import { Chapter } from "@/components/work/Chapter"
import { WorkAside } from "@/components/work/WorkAside"
import { useReadingProgress } from "@/hooks/useReveal"
import { templateById } from "@/data/workTemplates"
import { headlineProof, proofOf } from "@/data/work"
import { figuresFor, orphanFigures } from "@/lib/figures"
import { categoryById, roleById } from "@/data/taxonomy"
import { moreFromAuthor, similarWork } from "@/lib/similar"
import { useAccount } from "@/hooks/useAccount"
import { useBrowse } from "@/context/BrowseContext"
import { useTrafficSummary } from "@/hooks/useTrafficSummary"
import { applyMeta, clamp } from "@/lib/head"
import { track } from "@/lib/analytics"
import { fetchWorkBySlug } from "@/lib/api/endpoints/work"
import { mapWork } from "@/lib/api/mappers"
import { QUERY_KEYS } from "@/lib/api/queryKeys"

export function WorkPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { allWork, authors, addSkillFilter, openReport } = useBrowse()
  const { account } = useAccount()
  const { opensBySlug } = useTrafficSummary()
  const { ref: progressRef, progress } = useReadingProgress<HTMLElement>()

  const { data: work, isPending } = useQuery({
    queryKey: QUERY_KEYS.workDetail(id ?? ""),
    queryFn: async () => {
      const { work } = await fetchWorkBySlug(id!)
      return mapWork(work)
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })

  const moreByAuthor = useMemo(() => (work ? moreFromAuthor(work, allWork) : []), [work, allWork])
  const similar = useMemo(() => (work ? similarWork(work, allWork) : []), [work, allWork])

  useEffect(() => {
    if (work) track("case_study_opened")
  }, [work])

  useEffect(() => {
    if (!work) return
    const author = authors.get(work.authorId)
    return applyMeta({
      title: author ? `${work.title}, by ${author.name}` : work.title,
      description: clamp(work.summary || work.problem),
      type: "article",
      image: work.thumbnail,
    })
  }, [work, authors])

  if (isPending) return null

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
  const isMine = account?.id === work.authorId
  const opens = isMine ? (opensBySlug[work.id] ?? 0) : null
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
      <div aria-hidden="true" className="sticky top-16 z-30 h-0.5 w-full bg-transparent sm:top-18">
        <div
          className="h-full origin-left bg-ink transition-transform duration-150 ease-linear"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

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
                      onClick={() => addSkillFilter(skill)}
                      className="inline-flex min-h-10 cursor-pointer items-center rounded-pill border border-line bg-card px-3.5 font-display text-xs font-medium text-ink-2 transition-colors duration-200 hover:border-ink hover:text-ink"
                    >
                      {skill}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </header>

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

        <WorkAside
          work={work}
          author={author}
          proof={proof}
          opens={opens}
          onOpenAuthor={() => author && navigate(`/people/${author.id}`)}
          onReport={() => openReport({ kind: "work", id: work.id }, work.title)}
        />
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
