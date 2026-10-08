import { useQuery } from "@tanstack/react-query"
import { CONVERSIONS, FUNNEL_STEPS, rate, type FunnelCounts } from "@/lib/analytics"
import { fetchFunnel } from "@/lib/api/endpoints/moderation"
import { QUERY_KEYS } from "@/lib/api/queryKeys"
import { Empty } from "./primitives"

const FUNNEL_DAYS = 30

export function FunnelSection() {
  const { data, isPending, isError } = useQuery({
    queryKey: QUERY_KEYS.moderationFunnel(FUNNEL_DAYS),
    queryFn: () => fetchFunnel(FUNNEL_DAYS),
    staleTime: 60 * 1000,
  })

  if (isPending) {
    return <p className="py-16 text-center text-sm text-muted">Loading the funnel…</p>
  }

  if (isError) {
    return (
      <Empty
        title="Could not load the funnel"
        body="The API did not answer. Reload the page to try again."
      />
    )
  }

  const counts = (data?.totals ?? {}) as FunnelCounts

  const byStage = FUNNEL_STEPS.reduce<Record<string, (typeof FUNNEL_STEPS)[number][]>>(
    (groups, step) => {
      groups[step.stage] = [...(groups[step.stage] ?? []), step]
      return groups
    },
    {},
  )
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0)

  if (total === 0) {
    return (
      <Empty
        title="No events yet"
        body="Sign up, open the entry form or run a search, then come back. Counters are aggregated on the server across everyone."
      />
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="display text-xl">Conversion</h2>
        <ul className="mt-4">
          {CONVERSIONS.map((conversion) => {
            const value = rate(counts, conversion)
            const from = counts[conversion.from] ?? 0
            const to = counts[conversion.to] ?? 0
            return (
              <li key={conversion.label} className="border-t border-line py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="font-display text-sm font-semibold text-ink">{conversion.label}</p>
                  <p className="font-display text-sm text-muted">
                    {value === null ? (
                      "no data yet"
                    ) : (
                      <>
                        <span className="display text-xl text-ink">{value}%</span>{" "}
                        <span>
                          ({to} of {from})
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{conversion.why}</p>
              </li>
            )
          })}
        </ul>
      </section>

      {Object.entries(byStage).map(([stage, steps]) => (
        <section key={stage}>
          <h2 className="display text-xl capitalize">{stage}</h2>
          <ul className="mt-4">
            {steps.map((step) => (
              <li
                key={step.id}
                className="flex items-baseline justify-between gap-4 border-t border-line py-3"
              >
                <span className="text-sm text-ink-2">{step.label}</span>
                <span className="font-display text-sm font-semibold text-ink">
                  {counts[step.id] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="border-t border-line pt-8">
        <h2 className="display text-xl">What this is not</h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
          Counters, not an event stream. There is no identifier, no timestamp per event, no path or
          referrer, and no third-party script. Two people who published an entry are
          indistinguishable here, which is enough to answer "do people finish" and not enough to
          reconstruct anyone's session. The window is the last {data?.days ?? FUNNEL_DAYS} days.
        </p>
      </section>
    </div>
  )
}
