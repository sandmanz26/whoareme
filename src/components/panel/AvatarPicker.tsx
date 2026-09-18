import { useRef, useState } from "react"
import { Avatar } from "@/components/ui/Avatar"
import { Trash, Upload } from "@/components/ui/Icon"
import { dataUrlBytes, fileToAvatar, formatBytes } from "@/lib/image"

interface AvatarPickerProps {
  value: string
  /** Drives the monogram and its tint while there is no photo. */
  name: string
  onChange: (photo: string) => void
}

/**
 * Optional, like the case-study cover.
 *
 * The monogram is a real fallback rather than a placeholder to be ashamed of:
 * it is deterministic, tinted from the person's own name, and it never looks
 * broken. Plenty of people have good reasons not to put their face on a public
 * directory, and a profile should not read as unfinished because of it.
 *
 * The file is downscaled to 320px before it is stored, because everything here
 * shares one `localStorage` budget with the person's drafts.
 */
export function AvatarPicker({ value, name, onChange }: AvatarPickerProps) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      onChange(await fileToAvatar(file))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not use that image.")
    } finally {
      setBusy(false)
      // Clearing lets the same file be picked again after a removal.
      if (input.current) input.current.value = ""
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
              {busy ? "Working…" : value ? "Replace" : "Upload a photo"}
            </button>

            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-pill px-3 font-display text-sm font-medium text-muted transition-colors duration-200 hover:text-pop-pink"
              >
                <Trash size={15} />
                Remove
              </button>
            )}
          </div>

          <p className="text-xs text-muted">
            {value
              ? `Stored at ${formatBytes(dataUrlBytes(value))} in this browser.`
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
        accept="image/*"
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  )
}
