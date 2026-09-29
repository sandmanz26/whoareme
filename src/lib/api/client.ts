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
