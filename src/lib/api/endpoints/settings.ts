import { api } from "../client"

type Wrap<T> = { success: boolean; data: T; message: string }

/**
 * Public site settings. Same shape the moderator endpoint returns, but readable
 * by anyone: it carries the withdrawn crafts and the editable copy, which every
 * visitor needs in order to see the same controls a moderator configured.
 */
export interface ApiSiteSettings {
  contact: { email: string; location: string; responseTime: string }
  copy: Record<string, string>
  /** Crafts withdrawn from browse controls. Not a content filter. */
  disabledRoles: string[]
}

export async function fetchPublicSettings(): Promise<ApiSiteSettings> {
  const res = await api.get<Wrap<ApiSiteSettings>>("/user/settings")
  return res.data.data
}
