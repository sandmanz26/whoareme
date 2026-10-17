import { CATEGORIES, type CategoryId } from "@/data/taxonomy"
import { TOPIC_QUOTA } from "@/data/account"
import { cn } from "@/lib/utils"

/**
 * Topics double as a quota: two published entries per topic, per person. The
 * cap is visible in the chips rather than only appearing as an error at the
 * end, so nobody writes a third SaaS case study before finding out.
 */
export function TopicQuotaGroup({
  selected,
  usage,
  onToggle,
  error,
}: {
  selected: CategoryId[]
  usage: Record<string, number>
  onToggle: (id: CategoryId) => void
  error?: string
}) {
  const atMax = selected.length >= 4
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-display text-sm font-medium text-ink">Topics</legend>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => {
          const used = usage[category.id] ?? 0
          const isSelected = selected.includes(category.id)
          const atCap = !isSelected && (used >= TOPIC_QUOTA || atMax)

          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={isSelected}
              disabled={atCap}
              title={
                atCap ? `${TOPIC_QUOTA} published entries already in ${category.label}` : undefined
              }
              onClick={() => onToggle(category.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-pill border px-4 py-2.5",
                "font-display text-sm font-medium transition-all duration-200 ease-pop active:scale-[0.97]",
                isSelected
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-card text-ink-2 hover:border-ink/40",
                atCap && "cursor-not-allowed opacity-40 hover:border-line",
              )}
            >
              {category.label}
              <span className={cn("text-[0.6875rem]", isSelected ? "text-paper/60" : "text-muted")}>
                {used}/{TOPIC_QUOTA}
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted">
        Two published entries per topic. It keeps the directory readable and forces you to lead with
        your best two.
      </p>
      {error && (
        <p role="alert" className="text-xs font-medium text-pop-pink">
          {error}
        </p>
      )}
    </fieldset>
  )
}
