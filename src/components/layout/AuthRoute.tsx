import { type ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAccount } from "@/hooks/useAccount"
import { RouteLoading } from "@/components/layout/RouteLoading"

/** Redirects unauthenticated users to /signin. Use for member-only routes. */
export function AuthRoute({ children }: { children: ReactNode }) {
  const { account, isInitializing } = useAccount()
  const location = useLocation()
  if (isInitializing) return <RouteLoading label="Checking your session…" />
  if (!account) return <Navigate to="/signin" state={{ from: location }} replace />
  return <>{children}</>
}
