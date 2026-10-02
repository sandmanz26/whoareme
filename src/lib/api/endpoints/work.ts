import { api } from "../client"
import type { ApiWork, ApiWorkMine } from "../mappers"

type Wrap<T> = { success: boolean; data: T; message: string }

export async function fetchWorkMineList() {
  const res = await api.get<Wrap<{ items: ApiWorkMine[] }>>("/user/work/mine/list")
  return res.data.data
}

export async function fetchWorkMineById(id: string) {
  const res = await api.get<Wrap<{ work: ApiWorkMine }>>(`/user/work/mine/${id}`)
  return res.data.data
}

export async function postWork(body: object) {
  const res = await api.post<Wrap<{ work: ApiWorkMine }>>("/user/work", body)
  return res.data.data
}

export async function putWork(id: string, body: object) {
  const res = await api.put<Wrap<{ work: ApiWorkMine }>>(`/user/work/${id}`, body)
  return res.data.data
}

export async function deleteWork(id: string) {
  await api.delete(`/user/work/${id}`)
}

export async function postPublishWork(id: string) {
  const res = await api.post<Wrap<{ work: ApiWorkMine }>>(`/user/work/${id}/publish`)
  return res.data.data
}

export async function postUnpublishWork(id: string) {
  const res = await api.post<Wrap<{ work: ApiWorkMine }>>(`/user/work/${id}/unpublish`)
  return res.data.data
}

export async function postWorkThumbnail(id: string, file: File) {
  const form = new FormData()
  form.append("file", file)
  const res = await api.post<Wrap<{ thumbnailPath: string }>>(
    `/user/uploads/work/${id}/thumbnail`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  )
  return res.data.data
}

export async function deleteWorkThumbnail(id: string) {
  await api.delete(`/user/uploads/work/${id}/thumbnail`)
}

export async function fetchWorkBySlug(slug: string) {
  const res = await api.get<Wrap<{ work: ApiWork }>>(`/user/work/${slug}`)
  return res.data.data
}
