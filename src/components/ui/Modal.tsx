import { useCallback, useEffect, useRef, type ReactNode } from "react"
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll"
import { Close } from "./Icon"

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  /** Rendered under the title; keeps the dialog self-describing. */
  description?: string
  children: ReactNode
}

/**
 * Accessible dialog: labelled, scroll-locked, Escape-dismissible, with a
 * focus trap and focus restoration. Built from scratch rather than pulled
 * in so the app ships with zero runtime dependencies beyond React.
 */
export function Modal({ open, onClose, title, description, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusTo = useRef<HTMLElement | null>(null)

  useLockBodyScroll(open)

  const trapFocus = useCallback((event: KeyboardEvent) => {
    const panel = panelRef.current
    if (!panel) return

    const targets = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (targets.length === 0) return

    const first = targets[0]
    const last = targets[targets.length - 1]
    const active = document.activeElement

    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }, [])

  /**
   * Move focus into the dialog once, when it opens.
   *
   * This must depend on `open` and nothing else. It previously also depended
   * on `onClose` and `trapFocus`; callers that build `onClose` inline get a
   * new function identity on every render, so the effect re-ran on every
   * keystroke and sent focus back to the first focusable element - the close
   * button. The visible symptom was being able to type exactly one character
   * into any field in a dialog.
   */
  useEffect(() => {
    if (!open) return

    restoreFocusTo.current = document.activeElement as HTMLElement | null
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    return () => {
      restoreFocusTo.current?.focus()
    }
  }, [open])

  // Re-subscribing this one when a handler identity changes is harmless: it
  // adds and removes a listener and touches nothing the reader can see.
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      if (event.key === "Tab") trapFocus(event)
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onClose, trapFocus])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/60 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
        className="animate-pop-in relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-card border border-ink/10 bg-card shadow-[0_24px_80px_-24px_rgba(11,11,15,0.45)] sm:rounded-card"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5 sm:px-8">
          <div>
            <h2 id="modal-title" className="display text-2xl">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="mt-1.5 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill text-muted transition-colors duration-200 hover:bg-paper hover:text-ink"
          >
            <Close />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">{children}</div>
      </div>
    </div>
  )
}
