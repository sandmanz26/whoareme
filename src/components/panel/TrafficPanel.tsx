import { useMemo } from "react"
import {
  lastDays,
  opensByWork,
  seriesFor,
  totalProfileViews,
  totalWorkOpens,
  windowTotal,
  type TrafficStore,
} from "@/data/traffic"
import type { WorkDraft } from "@/data/account"
import { Chart, Eye } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"

const WINDOW = 30

function trendLabel(current: number, previous: number): { text: string; up: boolean } {
  if (previous === 0) return { text: current > 0 ? "new" : "no change", up: current > 0 }
  const delta = Math.round(((current - previous) / previous) * 100)
  return { text: `${delta >= 0 ? "+" : ""}${delta}% vs previous 7 days`, up: delta >= 0 }
}

/** Bars rather than a line: 30 integers, several of them zero, read better as bars. */
function Bars({ values, days, label }: { values: number[]; days: string[]; label: string }) {
  const peak = Math.max(1, ...values)

  return (
    <div className="flex h-24 items-end gap-[3px]" role="img" aria-label={label}>
      {values.map((value, index) => (
        <div
          key={days[index]}
          title={`${days[index]}: ${value}`}
          className={cn(
            "min-h-[2px] flex-1 rounded-t-[3px] transition-colors duration-200",
            value === 0 ? "bg-line" : "bg-ink",
          )}
          style={{ height: `${Math.max(2, (value / peak) * 100)}%` }}
        />
      ))}
    </div>
  )
}

function StatCard({
  icon,
  label,
  total,
  series,
  days,
}: {
  icon: React.ReactNode
  label: string
  total: number
  series: number[]
  days: string[]
}) {
  const trend = trendLabel(windowTotal(series, 7), windowTotal(series.slice(0, -7), 7))

  return (
    <section className="rounded-card border border-line bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-full bg-paper-2 text-ink-2">
            {icon}
          </span>
          {label}
        </h3>
        <span className="font-display text-3xl font-bold tracking-tight">{total}</span>
      </div>

      <div className="mt-5">
        <Bars values={series} days={days} label={`${label} over the last ${WINDOW} days`} />
        <div className="mt-2 flex items-center justify-between text-[0.6875rem] text-muted">
          <span>{WINDOW} days ago</span>
          <span
            className={cn(
              "font-display font-medium",
              trend.up ? "text-ink" : "text-muted",
            )}
          >
            {trend.text}
          </span>
          <span>today</span>
        </div>
      </div>
    </section>
  )
}

export function TrafficPanel({
  traffic,
  drafts,
}: {
  traffic: TrafficStore
  drafts: WorkDraft[]
}) {
  const days = useMemo(() => lastDays(WINDOW), [])
  const series = useMemo(() => seriesFor(traffic, days), [traffic, days])
  const perWork = useMemo(() => opensByWork(traffic), [traffic])

  const published = drafts.filter((draft) => draft.published)
  const ranked = [...published].sort((a, b) => (perWork[b.id] ?? 0) - (perWork[a.id] ?? 0))

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <StatCard
          icon={<Eye size={15} />}
          label="Profile views"
          total={totalProfileViews(traffic)}
          series={series.profile}
          days={series.days}
        />
        <StatCard
          icon={<Chart size={15} />}
          label="Portfolio opens"
          total={totalWorkOpens(traffic)}
          series={series.work}
          days={series.days}
        />
      </div>

      <section className="rounded-card border border-line bg-card p-5 sm:p-6">
        <h3 className="font-display text-base font-semibold tracking-tight">Opens by entry</h3>

        {published.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nothing published yet, so there is nothing to open. Publish an entry and opens start
            counting here.
          </p>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {ranked.map((draft) => {
              const opens = perWork[draft.id] ?? 0
              const peak = Math.max(1, ...ranked.map((item) => perWork[item.id] ?? 0))
              return (
                <li key={draft.id} className="flex items-center gap-4">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm font-medium text-ink">
                      {draft.values.title || "Untitled entry"}
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-pill bg-paper-2">
                      <span
                        className="block h-full rounded-pill bg-ink"
                        style={{ width: `${(opens / peak) * 100}%` }}
                      />
                    </span>
                  </span>
                  <span className="w-12 shrink-0 text-right font-display text-sm font-semibold tabular-nums">
                    {opens}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className="rounded-card border border-dashed border-ink/20 px-5 py-4 text-xs leading-relaxed text-muted">
        <span className="font-display font-semibold text-ink">How these numbers work.</span> This
        is a front-end demo with no server, so the 30-day history was generated when you
        registered. Opens and profile views that happen in this browser are counted for real on
        top of it. Signing out clears the lot.
      </p>
    </div>
  )
}
