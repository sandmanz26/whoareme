import { useEffect, useState } from "react"
import { Container } from "./Container"
import { Button } from "@/components/ui/Button"
import { Wordmark } from "./Wordmark"
import { useAccount } from "@/hooks/useAccount"
import { navigate, pageRootOf, useRoute } from "@/lib/router"
import { cn, initialsOf } from "@/lib/utils"

type NavLink =
  /** Jumps to a section of the home page, navigating there first if needed. */
  | { kind: "anchor"; id: string; label: string }
  /** A page of its own. */
  | { kind: "route"; path: string; label: string }

const LINKS: NavLink[] = [
  { kind: "anchor", id: "roles", label: "Browse roles" },
  { kind: "route", path: "/work", label: "Portfolios" },
  { kind: "anchor", id: "directory", label: "People" },
]

export function Navbar({ onJoin }: { onJoin: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const { account, signOut } = useAccount()
  const route = useRoute()
  const onHome = pageRootOf(route) === "home"

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300 ease-pop",
        scrolled ? "border-b border-line bg-paper/85 backdrop-blur-md" : "border-b border-transparent",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-6 sm:h-18">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="cursor-pointer rounded-pill"
          aria-label="whoareyou - home"
        >
          <Wordmark />
        </button>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = link.kind === "route" && route.path.startsWith(link.path)
            return (
              <button
                key={link.label}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (link.kind === "route") {
                    navigate(link.path)
                    return
                  }
                  if (onHome) {
                    document.getElementById(link.id)?.scrollIntoView({ behavior: "smooth" })
                    return
                  }
                  // Land on the home page first, then jump once it has rendered.
                  navigate("/")
                  window.setTimeout(
                    () => document.getElementById(link.id)?.scrollIntoView({ behavior: "smooth" }),
                    80,
                  )
                }}
                className={cn(
                  "cursor-pointer rounded-pill px-4 py-2.5 font-display text-sm font-medium",
                  "transition-colors duration-200 hover:bg-ink/5 hover:text-ink",
                  active ? "text-ink" : "text-ink-2",
                )}
              >
                {link.label}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          {account ? (
            <>
              <button
                type="button"
                onClick={signOut}
                className="hidden cursor-pointer rounded-pill px-4 py-2.5 font-display text-sm font-medium text-muted transition-colors duration-200 hover:text-ink sm:block"
              >
                Sign out
              </button>
              <Button size="sm" onClick={() => navigate("/panel")}>
                <span className="grid size-6 place-items-center rounded-full bg-pop-lime font-display text-[0.625rem] font-bold text-ink">
                  {initialsOf(account.name)}
                </span>
                <span className="whitespace-nowrap">
                  Your<span className="hidden sm:inline"> panel</span>
                </span>
              </Button>
            </>
          ) : (
            <>
              {/* Two different destinations, which they were not before: the
                  left one is for people who already have a profile in this
                  browser, the right one creates one. */}
              <span className="hidden sm:block">
                <Button variant="ghost" size="sm" onClick={() => navigate("/signin")}>
                  Sign in
                </Button>
              </span>
              <Button size="sm" onClick={onJoin}>
                <span className="whitespace-nowrap">
                  Sign<span className="hidden sm:inline"> up</span>
                </span>
              </Button>
            </>
          )}
        </div>
      </Container>
    </header>
  )
}
