import { api } from "../client"

type Wrap<T> = { success: boolean; data: T; message: string }

export interface ApiModerationReport {
  _id: string
  targetKind: "work" | "user"
  targetId: string
  reason: string
  note: string
  createdAt: string
}

export interface ApiAppealEntry {
  text: string
  createdAt: string
  outcome: "upheld" | "overturned" | null
  outcomeReason: string
  decidedAt: string | null
}

export interface ApiModerationAppeal {
  _id: string
  userId: string
  actionId: string
  action: string
  targetKind: "work" | "user" | null
  targetId: string | null
  targetLabel: string
  reason: string
  readAt: string | null
  appeal: ApiAppealEntry
  createdAt: string
}

export interface ApiModerationLogEntry {
  _id: string
  action: string
  targetKind: "work" | "user" | null
  targetId: string | null
  targetLabel: string
  reason: string
  actorId: string
  actorSlug: string
  createdAt: string
}

export interface ApiModerationSettings {
  contact: { email: string; location: string; responseTime: string }
  copy: Record<string, string>
  disabledRoles: string[]
}

export async function fetchReports(): Promise<ApiModerationReport[]> {
  const res = await api.get<Wrap<{ items: ApiModerationReport[] }>>("/moderation/reports")
  return res.data.data.items
}

export async function resolveReport(reportId: string, reason: string): Promise<void> {
  await api.post(`/moderation/reports/${reportId}/resolve`, { reason })
}

export async function unpublishWork(slug: string, reason: string): Promise<void> {
  await api.post(`/moderation/work/${slug}/unpublish`, { reason })
}

export async function republishWork(slug: string, reason: string): Promise<void> {
  await api.post(`/moderation/work/${slug}/republish`, { reason })
}

export async function suspendPerson(slug: string, reason: string): Promise<void> {
  await api.post(`/moderation/people/${slug}/suspend`, { reason })
}

export async function reinstatePerson(slug: string, reason: string): Promise<void> {
  await api.post(`/moderation/people/${slug}/reinstate`, { reason })
}

export async function fetchAppeals(): Promise<ApiModerationAppeal[]> {
  const res = await api.get<Wrap<{ items: ApiModerationAppeal[] }>>("/moderation/appeals")
  return res.data.data.items
}

export async function decideAppeal(
  appealId: string,
  outcome: "upheld" | "overturned",
  reason: string,
): Promise<void> {
  await api.post(`/moderation/appeals/${appealId}/decide`, { outcome, reason })
}

export async function fetchAuditLog(): Promise<ApiModerationLogEntry[]> {
  const res = await api.get<Wrap<{ items: ApiModerationLogEntry[] }>>("/moderation/log")
  return res.data.data.items
}

export async function fetchSettings(): Promise<ApiModerationSettings> {
  const res = await api.get<Wrap<ApiModerationSettings>>("/moderation/settings")
  return res.data.data
}

export async function updateSettings(
  patch: Partial<Pick<ApiModerationSettings, "contact" | "copy" | "disabledRoles">>,
  reason: string,
): Promise<ApiModerationSettings> {
  const res = await api.put<Wrap<ApiModerationSettings>>("/moderation/settings", { ...patch, reason })
  return res.data.data
}