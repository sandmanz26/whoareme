import { useCallback, useState } from "react"
import { readJson, writeJson } from "@/lib/storage"

const KEY = "onboarding"

interface OnboardingState {
  hidden: boolean
}

/**
 * Whether the onboarding checklist is showing.
 *
 * Dismissible, and recoverable from the overview - a tour you cannot skip is
 * the most complained-about pattern in onboarding, and one you can skip but
 * never get back is only marginally better.
 */
export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(() =>
    readJson<OnboardingState>(KEY, { hidden: false }),
  )

  const set = useCallback((hidden: boolean) => {
    const next = { hidden }
    setState(next)
    writeJson(KEY, next)
  }, [])

  return {
    hidden: state.hidden,
    hide: useCallback(() => set(true), [set]),
    show: useCallback(() => set(false), [set]),
  }
}
