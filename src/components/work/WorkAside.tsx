import { Avatar } from "@/components/ui/Avatar"
import { SocialLinks } from "@/components/ui/SocialLinks"
import { Badge } from "@/components/ui/Badge"
import { ArrowUpRight, Chart, Pin } from "@/components/ui/Icon"
import { businessModelById } from "@/data/businessModels"
import { ReportButton } from "@/components/admin/ReportModal"
import type { Work, WorkDetail } from "@/data/work"
import type { Author } from "@/lib/authors"

export function WorkAside({
  work,
  author,
  proof,
  opens,
  onOpenAuthor,
  onReport,
}: {
  work: Work
  author?: Author
  proof: WorkDetail[]
  opens: number | null
  onOpenAuthor: () => void
  onReport: () => void
}) {
  return (
    <aside className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
      {author && (
        <div className="rounded-card border border-line bg-card p-5">
          <button
            type="button"
            onClick={onOpenAuthor}
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
            <span>Only you see this. Counts opens by others - your own visits are excluded.</span>
          </p>
        </div>
      )}

      <p className="text-center">
        <ReportButton onClick={onReport} />
      </p>
    </aside>
  )
}
