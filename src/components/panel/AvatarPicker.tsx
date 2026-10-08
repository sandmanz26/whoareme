import { useRef, useState } from "react"
import { Avatar } from "@/components/ui/Avatar"
import { Trash, Upload } from "@/components/ui/Icon"
import { apiErrorMessage } from "@/lib/api/client"
import { deleteProfilePhoto, postProfilePhoto } from "@/lib/api/endpoints/uploads"
import { useAccount } from "@/hooks/useAccount"

interface AvatarPickerProps {
  value: string
  name: string
  onChange: (photo: string) => void
}

export function AvatarPicker({ value, name, onChange }: AvatarPickerProps) {
  const { refreshAccount } = useAccount()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const { photoUrl } = await postProfilePhoto(file)
      onChange(photoUrl)
      await refreshAccount()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  async function handleRemove() {
    setError(null)
    setBusy(true)
    try {
      await deleteProfilePhoto()
      onChange("")
      await refreshAccount()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-display text-sm font-medium text-ink">Portrait</p>

      <div className="flex items-center gap-5">
        <Avatar
          src={value}
          name={name || "You"}
          className="size-20 shrink-0 rounded-[30%] border border-ink/10 bg-paper-2 text-lg"
        />

        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-pill border border-ink/15 bg-card px-4 font-display text-sm font-medium text-ink transition-colors duration-200 hover:border-ink disabled:opacity-50"
            >
              <Upload size={15} />
              {busy ? "Uploading…" : value ? "Replace" : "Upload a photo"}
            </button>

            {value && (
              <button
                type="button"
                disabled={busy}
                onClick={handleRemove}
                className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-pill px-3 font-display text-sm font-medium text-muted transition-colors duration-200 hover:text-pop-pink disabled:opacity-50"
              >
                <Trash size={15} />
                Remove
              </button>
            )}
          </div>

          <p className="text-xs text-muted">
            {value
              ? "Photo saved. Visible on your profile immediately."
              : "Optional. Without one you get a monogram tinted from your name."}
          </p>
          {error && (
            <p role="alert" className="text-xs font-medium text-pop-pink">
              {error}
            </p>
          )}
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  )
}
