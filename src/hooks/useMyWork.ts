import { useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { WorkDraft } from "@/data/account"
import { mapApiWorkMineToDraft, draftToApiBody } from "@/lib/api/mappers"
import {
  fetchWorkMineList,
  postWork,
  putWork,
  deleteWork,
  postWorkThumbnail,
  deleteWorkThumbnail,
  postPublishWork,
  postUnpublishWork,
} from "@/lib/api/endpoints/work"
import { QUERY_KEYS } from "@/lib/api/queryKeys"

const isLocalId = (id: string) => id.startsWith("w-")

/**
 * Manages the current user's work drafts.
 * Data is pre-populated into the query cache by AccountProvider after login/session restore.
 * Multiple callers (AccountProvider, PanelPage) share the same cache entry.
 */
export function useMyWork() {
  const queryClient = useQueryClient()

  // `enabled: false` — never auto-fetches. Reads from cache populated by AccountProvider.
  // queryFn is provided so TanStack Query knows the data shape and can refetch on explicit invalidation.
  const { data: drafts = [] } = useQuery<WorkDraft[]>({
    queryKey: QUERY_KEYS.workMineList,
    queryFn: async () => {
      const { items } = await fetchWorkMineList()
      return items.map(mapApiWorkMineToDraft)
    },
    enabled: false,
    staleTime: Infinity,
  })

  // Kept in sync so saveDraft can compare previous thumbnail/publish state without a closure dep
  const draftsRef = useRef<WorkDraft[]>(drafts)
  draftsRef.current = drafts

  async function saveDraft(draft: WorkDraft): Promise<WorkDraft> {
    const body = draftToApiBody(draft)
    let resolved = draft

    if (isLocalId(draft.id)) {
      // First save: create on server, swap local id → MongoDB id
      const { work } = await postWork(body)
      const serverDraft = mapApiWorkMineToDraft(work)
      resolved = {
        ...serverDraft,
        values:   draft.values,
        links:    draft.links,
        sections: draft.sections,
        metrics:  draft.metrics,
        skills:   draft.skills,
        topics:   draft.topics,
        figures:  draft.figures,
      }
    } else {
      await putWork(draft.id, body)
      resolved = { ...draft, updatedAt: new Date().toISOString() }
    }

    // Handle thumbnail: upload data URL, or delete if cleared
    const prevThumb = draftsRef.current.find(
      (d) => d.id === draft.id || d.id === resolved.id,
    )?.thumbnail

    if (resolved.thumbnail?.startsWith("data:")) {
      try {
        const blob = await fetch(resolved.thumbnail).then((r) => r.blob())
        const ext  = blob.type.split("/")[1] ?? "jpg"
        const file = new File([blob], `thumbnail.${ext}`, { type: blob.type })
        const { thumbnailPath } = await postWorkThumbnail(resolved.id, file)
        resolved = { ...resolved, thumbnail: thumbnailPath }
      } catch {
        // Upload failed — keep data URL locally, will retry on next save
      }
    } else if (!resolved.thumbnail && prevThumb && !prevThumb.startsWith("data:")) {
      await deleteWorkThumbnail(resolved.id).catch(() => {})
    }

    // Handle publish state change
    const prev        = draftsRef.current.find((d) => d.id === draft.id || d.id === resolved.id)
    const wasPublished = prev?.published ?? false

    if (resolved.published && !wasPublished) {
      try {
        await postPublishWork(resolved.id)
      } catch {
        resolved = { ...resolved, published: false }
      } finally {
        queryClient.invalidateQueries({ queryKey: ["work", "list"] })
        queryClient.invalidateQueries({ queryKey: ["people", "list"] })
      }
    } else if (!resolved.published && wasPublished) {
      await postUnpublishWork(resolved.id).catch(() => {})
      queryClient.invalidateQueries({ queryKey: ["work", "list"] })
      queryClient.invalidateQueries({ queryKey: ["people", "list"] })
    }

    // Update cache: remove old local-id entry if id changed, then upsert
    queryClient.setQueryData<WorkDraft[]>(QUERY_KEYS.workMineList, (current = []) => {
      const without = current.filter((d) => d.id !== draft.id)
      const exists  = without.some((d) => d.id === resolved.id)
      return exists
        ? without.map((d) => (d.id === resolved.id ? resolved : d))
        : [resolved, ...without]
    })

    return resolved
  }

  async function deleteDraft(id: string): Promise<void> {
    if (!isLocalId(id)) {
      await deleteWork(id)
    }
    queryClient.setQueryData<WorkDraft[]>(QUERY_KEYS.workMineList, (current = []) =>
      current.filter((d) => d.id !== id),
    )
  }

  return { drafts, saveDraft, deleteDraft }
}
