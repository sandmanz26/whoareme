import axios from "axios"

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000"

export const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  headers: { "Content-Type": "application/json" },
})

let _token: string | null = null

export function setApiToken(token: string | null) {
  _token = token
}

api.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`
  return config
})

/**
 * The one place an axios failure becomes a sentence a person can read.
 * The API always answers `{ success, data, message }`, so the message field is
 * preferred over axios's own (which is URL-shaped and unhelpful).
 */
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message
    return message ?? err.message
  }
  return err instanceof Error ? err.message : "Something went wrong."
}
