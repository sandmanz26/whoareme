import { Avatar } from "@/components/ui/Avatar"
import { Badge } from "@/components/ui/Badge"
import { ArrowUpRight, Check } from "@/components/ui/Icon"
import { WorkCover } from "./WorkCover"
import { headlineProof, proofOf, type Work } from "@/data/work"
import { categoryById, roleById } from "@/data/taxonomy"
import type { Author } from "@/lib/authors"
import { navigate } from "@/lib/router"
import type { CSSVars } from "@/lib/css"
import { cn } from "@/lib/utils"

interface WorkCardProps {
  work: Work
  author?: Author
  /** Position in the grid, used to stagger the entrance animation. */
  index: number
  /** Provided where a skill chip can drive the filter; omitted in previews. */
  onSkillClick?: (skill: string) => void
}

export function WorkCard({ work, author, index, onSkillClick }: WorkCardProps) {
  const headline = headlineProof(work)
  const supporting = proofOf(work).slice(1, 3)

  return (
    <article
      className="animate-fade-up group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-card border border-line bg-card transition-all duration-250 ease-pop hover:-translate-y-1 hover:border-ink/30 hover:shadow-[0_24px_60px_-30px_rgba(11,11,15,0.5)]"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` } as CSSVars}
    >
      {work.thumbnail ? (
        // An uploaded thumbnail still has to carry the number, so the metric
        // sits on a scrim rather than being dropped for a prettier picture.
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <img src={work.thumbnail} alt="" className="size-full object-cover" />
          {headline && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent p-5 pt-10 text-paper">
              <p className="display text-[clamp(1.1rem,2.6vw,1.5rem)] leading-[1.05]">
                {headline.value}
              </p>
              <p className="mt-1 font-display text-[0.6875rem] font-medium tracking-[0.16em] uppercase opacity-75">
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
          className="aspect-[16/9] w-full"
        />
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-ink/20 bg-paper-2">{roleById(work.role).label}</Badge>
          {work.topics.slice(0, 2).map((topic) => (
            <Badge key={topic}>{categoryById(topic).label}</Badge>
          ))}
          <span className="ml-auto font-display text-xs text-muted">{work.year}</span>
        </div>

        <h3 className="mt-4 font-display text-lg leading-snug font-semibold tracking-tight text-ink">
          {work.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{work.summary}</p>

        {work.skills.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {work.skills.slice(0, 4).map((skill) => (
              <li key={skill}>
                <button
                  type="button"
                  onClick={() => onSkillClick?.(skill)}
                  disabled={!onSkillClick}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-pill border border-line bg-paper px-2.5",
                    "font-display text-[0.6875rem] font-medium text-ink-2 transition-colors duration-200",
                    onSkillClick && "cursor-pointer hover:border-ink hover:text-ink",
                  )}
                >
                  {skill}
                </button>
              </li>
            ))}
          </ul>
        )}

        {supporting.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {supporting.map((detail) => (
              <li key={detail.label} className="flex items-start gap-2 text-xs text-ink-2">
                <Check size={14} className="mt-0.5 shrink-0 text-pop-violet" />
                <span>
                  <span className="text-muted">{detail.label}:</span> {detail.value}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* mt-auto pins the byline to the bottom; pt-5 keeps a gap above the rule
            even when the card content is short. */}
        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar
                src={author?.photo}
                name={author?.name ?? "Unknown"}
                className="size-8 shrink-0 rounded-full border border-ink/10 bg-paper-2 text-[0.7rem]"
              />
              <div className="min-w-0">
                <p className="truncate font-display text-xs font-semibold text-ink">
                  {author?.name ?? "Unknown"}
                  {author?.isViewer && <span className="ml-1 text-muted">· you</span>}
                </p>
                <p className="truncate text-[0.6875rem] text-muted">
                  {author ? `${author.title} · ${author.company}` : work.scope}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/work/${work.id}`)}
              className={cn(
                "inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-pill px-3 py-2",
                "font-display text-xs font-semibold text-ink transition-colors duration-200",
                "hover:bg-ink hover:text-paper",
              )}
            >
              Case study
              <ArrowUpRight size={14} />
              <span className="sr-only">for {work.title}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
