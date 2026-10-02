import type { ReadinessItem } from "@/lib/readiness"
import { Check } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"

/**
 * What is still missing, while it can still be fixed cheaply.
 *
 * The alternative - validate on submit - hands someone a wall of errors after
 * they have written a case study, which is the most reliable way to lose the
 * case study. This is the same list the publish check runs, so what it says is
 * what will happen.
 */
export function PublishReadiness({
  items,
  published,
}: {
  items: readonly ReadinessItem[]
  published: boolean
}) {
  const done = items.filter((item) => item.done).length
  const ready = done === items.length
  const percent = items.length === 0 ? 100 : Math.round((done / items.length) * 100)

  return (
    <section
      className={cn(
        "rounded-card border p-5",
        ready ? "border-ink bg-ink text-paper" : "border-line bg-card",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-sm font-semibold tracking-tight">
          {published ? "Published" : ready ? "Ready to publish" : "Before you publish"}
        </h3>
        <span className={cn("font-display text-xs", ready ? "text-paper/60" : "text-muted")}>
          {done}/{items.length}
        </span>
      </div>

      <div
        className={cn(
          "mt-3 h-1.5 overflow-hidden rounded-pill",
          ready ? "bg-paper/20" : "bg-paper-2",
        )}
      >
        <div
          className={cn(
            "h-full rounded-pill transition-[width] duration-500 ease-pop",
            ready ? "bg-pop-lime" : "bg-ink",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="mt-4 flex flex-col gap-2.5" aria-live="polite">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-px grid size-4 shrink-0 place-items-center rounded-full",
                item.done
                  ? ready
                    ? "bg-pop-lime text-ink"
                    : "bg-pop-lime text-ink"
                  : ready
                    ? "border border-dashed border-paper/40"
                    : "border border-dashed border-ink/25",
              )}
            >
              {item.done && <Check size={10} />}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-xs leading-snug",
                  item.done
                    ? ready
                      ? "text-paper/60"
                      : "text-muted line-through decoration-ink/20"
                    : ready
                      ? "text-paper"
                      : "font-medium text-ink",
                )}
              >
                {item.label}
              </span>
              {!item.done && item.hint && (
                <span
                  className={cn("mt-0.5 block text-xs", ready ? "text-paper/50" : "text-muted")}
                >
                  {item.hint}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {ready && !published && (
        <p className="mt-4 text-xs leading-relaxed text-paper/65">
          Nothing is blocking you. You can still save a draft and come back.
        </p>
      )}
    </section>
  )
}
