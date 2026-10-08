import axios from "axios"

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000"

export const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  timeout: 10_000,
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
 * A 401 on an authenticated call means the session is gone: the token was
 * cleared server-side, expired, or the account was removed. Instead of handling
 * that at every call site, the interceptor announces it once and the account
 * provider clears the session; the route guards then send the person to sign in.
 *
 * Sign-in and register are excluded, because a 401 there is a wrong password,
 * not an expired session.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? ""
      if (!url.includes("/auth/login") && !url.includes("/auth/register")) {
        window.dispatchEvent(new Event("wru:unauthorized"))
      }
    }
    return Promise.reject(error)
  },
)

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
