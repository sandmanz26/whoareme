import type { ReactNode } from "react"
import { Container } from "@/components/layout/Container"
import { navigate } from "@/lib/router"
import { cn } from "@/lib/utils"
import { ArrowUpRight } from "@/components/ui/Icon"

export interface PanelNavItem {
  id: string
  label: string
  href: string
  badge?: string
}

interface PanelShellProps {
  items: PanelNavItem[]
  activeId: string
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function PanelShell({
  items,
  activeId,
  title,
  description,
  action,
  children,
}: PanelShellProps) {
  return (
    <Container className="grid gap-10 py-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14 lg:py-14">
      <nav aria-label="Panel" className="lg:sticky lg:top-24 lg:self-start">
        <p className="eyebrow">Your panel</p>
        <ul className="no-scrollbar mt-4 flex gap-2 overflow-x-auto lg:mt-5 lg:flex-col lg:gap-1 lg:overflow-visible">
          {items.map((item) => {
            const active = item.id === activeId
            return (
              <li key={item.id} className="shrink-0">
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-3 rounded-pill px-4 py-2.5",
                    "font-display text-sm font-medium transition-colors duration-200",
                    active ? "bg-ink text-paper" : "text-ink-2 hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  {item.label}
                  {item.badge && (
                    <span
                      className={cn(
                        "rounded-pill px-2 py-0.5 text-[0.6875rem]",
                        active ? "bg-paper/15 text-paper" : "bg-paper-2 text-muted",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
          <li className="shrink-0 lg:mt-4 lg:border-t lg:border-line lg:pt-4">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex w-full cursor-pointer items-center gap-1.5 rounded-pill px-4 py-2.5 font-display text-sm font-medium text-muted transition-colors duration-200 hover:text-ink"
            >
              View directory
              <ArrowUpRight size={14} />
            </button>
          </li>
        </ul>
      </nav>

      <div className="min-w-0">
        <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="display text-[clamp(1.75rem,4vw,2.5rem)]">{title}</h1>
            {description && <p className="mt-2 max-w-xl text-sm text-muted">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>

        <div className="mt-8">{children}</div>
      </div>
    </Container>
  )
}
