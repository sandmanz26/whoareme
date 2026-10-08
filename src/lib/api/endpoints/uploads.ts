import { api } from "../client"

type Wrap<T> = { success: boolean; data: T; message: string }

/** Upload the signed-in person's portrait. Returns the stored URL. */
export async function postProfilePhoto(file: File): Promise<{ photoUrl: string }> {
  const form = new FormData()
  form.append("file", file)
  const res = await api.post<Wrap<{ photoUrl: string }>>("/user/uploads/profile/photo", form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return res.data.data
}

export async function deleteProfilePhoto(): Promise<void> {
  await api.delete("/user/uploads/profile/photo")
}
