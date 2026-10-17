import { type ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAccount } from "@/hooks/useAccount"
import { RouteLoading } from "@/components/layout/RouteLoading"

/** Redirects non-moderators to /. Use for moderation-only routes. */
export function ModRoute({ children }: { children: ReactNode }) {
  const { account, isInitializing } = useAccount()
  if (isInitializing) return <RouteLoading label="Checking your access…" />
  const isMod = account?.access === "moderator" || account?.access === "admin"
  if (!isMod) return <Navigate to="/" replace />
  return <>{children}</>
}
