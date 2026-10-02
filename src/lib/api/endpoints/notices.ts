import { api } from "../client"

type Wrap<T> = { success: boolean; data: T; message: string }

export interface ApiUserNotice {
  _id: string
  userId: string
  actionId: string
  action: string
  targetKind: "work" | "user" | null
  targetId: string | null
  targetLabel: string
  reason: string
  readAt: string | null
  appeal: {
    text: string
    createdAt: string
    outcome: "upheld" | "overturned" | null
    outcomeReason: string
    decidedAt: string | null
  } | null
  createdAt: string
}

export async function fetchUserNotices(): Promise<ApiUserNotice[]> {
  const res = await api.get<Wrap<{ items: ApiUserNotice[] }>>("/notices")
  return res.data.data.items
}

export async function postMarkNoticeRead(noticeId: string): Promise<void> {
  await api.post(`/notices/${noticeId}/read`)
}

export async function postAppealNotice(noticeId: string, text: string): Promise<void> {
  await api.post(`/notices/${noticeId}/appeal`, { text })
}

export async function postReport(
  targetKind: "work" | "user",
  targetId: string,
  reason: string,
  note: string,
): Promise<void> {
  await api.post("/reports", { targetKind, targetId, reason, note })
}
