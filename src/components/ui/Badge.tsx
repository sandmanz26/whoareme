import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border border-ink/10 bg-paper px-2.5 py-1",
        "font-display text-[0.6875rem] font-medium tracking-wide text-ink-2",
        className,
      )}
    >
      {children}
    </span>
  )
}
