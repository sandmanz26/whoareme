import { api } from "../client"

type Wrap<T> = { success: boolean; data: T; message: string }

export interface ApiTrafficSummary {
  range: { from: string; to: string; days: number }
  series: Array<{ day: string; profile: number; work: number }>
  totals: { profileViews: number; workOpens: number }
  perWork: Array<{ workId: string; slug: string | null; title: string; status: string; opens: number }>
}

export async function fetchTrafficSummary(days = 30) {
  const res = await api.get<Wrap<ApiTrafficSummary>>("/user/traffic/me", { params: { days } })
  return res.data.data
}