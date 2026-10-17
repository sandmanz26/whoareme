import { api } from "../client"
import type { ApiUser } from "../mappers"

type Wrap<T> = { success: boolean; data: T; message: string }

export async function fetchMe() {
  const res = await api.get<Wrap<{ user: ApiUser }>>("/user/auth/me")
  return res.data.data
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  location: string
  role: string
  title: string
  years: number
  topics: string[]
  portfolioUrl: string
  pitch: string
}

export async function postRegister(input: RegisterInput) {
  // 202 with a deliberately uniform body: the response never says whether the
  // address was free, so it cannot be used to enumerate accounts.
  await api.post("/user/auth/register", input)
}

export async function postLogin(email: string, password: string) {
  const res = await api.post<Wrap<{ token: string; user: ApiUser }>>("/user/auth/login", {
    email,
    password,
  })
  return res.data.data
}

export async function postLogout() {
  await api.post("/user/auth/logout")
}

export async function deleteMe() {
  await api.delete("/user/auth/me")
}

export async function postVerifyRequest() {
  const res = await api.post<
    Wrap<{ alreadyVerified?: boolean; token?: string; deliveredBy?: string }>
  >("/user/auth/verify/request")
  return res.data.data
}

export async function postVerifyConfirm(token: string) {
  const res = await api.post<Wrap<{ slug: string; email: string | null }>>(
    "/user/auth/verify/confirm",
    { token },
  )
  return res.data.data
}

export async function patchMe(patch: Record<string, unknown>) {
  const res = await api.patch<Wrap<{ user: ApiUser }>>("/user/auth/me", patch)
  return res.data.data
}

export async function postForgotPassword(email: string) {
  const res = await api.post<Wrap<{ deliveredBy: string; token?: string }>>(
    "/user/auth/forgot-password",
    { email },
  )
  return res.data.data
}

export async function postResetPassword(token: string, password: string) {
  const res = await api.post<Wrap<{ token: string; user: ApiUser }>>("/user/auth/reset-password", {
    token,
    password,
  })
  return res.data.data
}
