import { type ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAccount } from "@/hooks/useAccount"

/** Redirects authenticated users to /panel. Use for signin/reset routes. */
export function GuestRoute({ children }: { children: ReactNode }) {
  const { account, isInitializing } = useAccount()
  if (isInitializing) return null
  if (account) return <Navigate to="/panel" replace />
  return <>{children}</>
}
