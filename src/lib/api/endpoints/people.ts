import { api } from "../client"
import type { ApiUser, ApiWorkCard } from "../mappers"

type Wrap<T> = { success: boolean; data: T; message: string }

export async function fetchPersonBySlug(slug: string) {
  const res = await api.get<Wrap<{ user: ApiUser }>>(`/user/people/${slug}`)
  return res.data.data
}

export async function fetchPersonWork(slug: string) {
  const res = await api.get<Wrap<{ items: ApiWorkCard[] }>>(`/user/people/${slug}/work`)
  return res.data.data
}

export async function fetchPeopleList(params?: Record<string, unknown>) {
  const res = await api.get<Wrap<{ items: ApiUser[]; total: number }>>("/user/people", { params })
  return res.data.data
}

export async function fetchWorkList(params?: Record<string, unknown>) {
  const res = await api.get<Wrap<{ items: ApiWorkCard[]; total: number }>>("/user/work", { params })
  return res.data.data
}
