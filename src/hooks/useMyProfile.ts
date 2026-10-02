import { useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { Account } from "@/data/account"
import { patchMe } from "@/lib/api/endpoints/auth"
import { QUERY_KEYS } from "@/lib/api/queryKeys"
import type { ApiUser } from "@/lib/api/mappers"

// Translates Account field names → backend field names for PATCH /auth/me
function profilePatchToApi(patch: Partial<Account>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (patch.name      !== undefined) out.name         = patch.name
  if (patch.title     !== undefined) out.title        = patch.title
  if (patch.location  !== undefined) out.location     = patch.location
  if (patch.role      !== undefined) out.role         = patch.role
  if (patch.years     !== undefined) out.years        = Number(patch.years) || 0
  if (patch.topics    !== undefined) out.topics       = patch.topics
  if (patch.portfolio !== undefined) out.portfolioUrl = patch.portfolio
  if (patch.pitch     !== undefined) out.pitch        = patch.pitch
  // photo → handled by AvatarPicker via /uploads/profile/photo (separate endpoint)
  return out
}

export function useMyProfile() {
  const queryClient = useQueryClient()

  const updateProfile = useCallback((patch: Partial<Account>) => {
    const apiPatch = profilePatchToApi(patch)
    // Optimistic: update the me cache so account reflects the change immediately
    queryClient.setQueryData<{ user: ApiUser }>(QUERY_KEYS.me, (old) => {
      if (!old) return old
      return { user: { ...old.user, ...apiPatch } as ApiUser }
    })
    // Sync to server; on failure refetch server truth to revert the optimistic update
    patchMe(apiPatch).catch(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.me })
    })
  }, [queryClient])

  return { updateProfile }
}
