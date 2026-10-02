import { useQuery } from "@tanstack/react-query"
import { useAccount } from "./useAccount"
import { fetchTrafficSummary } from "@/lib/api/endpoints/traffic"
import { QUERY_KEYS } from "@/lib/api/queryKeys"
import { lastDays } from "@/data/traffic"

const DAYS = 30

const EMPTY_SERIES = {
  days:    lastDays(DAYS),
  profile: Array<number>(DAYS).fill(0),
  work:    Array<number>(DAYS).fill(0),
}

export interface TrafficSummary {
  series:      { days: string[]; profile: number[]; work: number[] }
  totals:      { profileViews: number; workOpens: number }
  opensBySlug: Record<string, number>
  isPending:   boolean
}

export function useTrafficSummary(): TrafficSummary {
  const { account } = useAccount()

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEYS.trafficSummary,
    queryFn:  () => fetchTrafficSummary(DAYS),
    enabled:  !!account,
    staleTime: 5 * 60 * 1000,
    select: (raw) => ({
      series: {
        days:    raw.series.map((s) => s.day),
        profile: raw.series.map((s) => s.profile),
        work:    raw.series.map((s) => s.work),
      },
      totals:      raw.totals,
      opensBySlug: Object.fromEntries(
        raw.perWork
          .filter((p) => p.slug !== null)
          .map((p) => [p.slug!, p.opens]),
      ),
    }),
  })

  return {
    series:      data?.series      ?? EMPTY_SERIES,
    totals:      data?.totals      ?? { profileViews: 0, workOpens: 0 },
    opensBySlug: data?.opensBySlug ?? {},
    isPending:   isPending && !!account,
  }
}