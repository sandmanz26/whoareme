import { Container } from "./Container"
import { Wordmark } from "./Wordmark"
import { ArrowUpRight } from "@/components/ui/Icon"

/**
 * `href` is a real route where one exists. Everything else is deliberately
 * inert and marked as such, rather than pointing at "#/" and pretending - a
 * link that silently returns you to the home page is worse than a label.
 */
const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Directory", href: "/" },
      { label: "Portfolios", href: "/work" },
      { label: "Your panel", href: "/panel" },
      { label: "Pricing" },
    ],
  },
  {
    title: "For talent",
    links: [
      { label: "Create a profile", href: "/panel/profile" },
      { label: "Add an entry", href: "/panel/portfolio/new" },
      { label: "Portfolio tips" },
      { label: "Verification" },
    ],
  },
  {
    title: "For teams",
    links: [
      { label: "Search talent", href: "/work" },
      { label: "Shortlists" },
      { label: "Team seats" },
      { label: "Case studies", href: "/work" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Changelog", href: "/changelog" },
      { label: "Privacy", href: "/privacy" },
      { label: "Contact" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <Container className="py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div className="max-w-sm">
            <Wordmark />
            <p className="mt-5 text-sm leading-relaxed text-muted">
              A segmented directory for people who build technology. One profile, sorted by the
              work you actually do - not by the job title you happened to get.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="eyebrow">{column.title}</h3>
                <ul className="mt-3 space-y-1">
                  {column.links.map((link) =>
                    link.href ? (
                      <li key={link.label}>
                        <a
                          href={`#${link.href}`}
                          className="group inline-flex min-h-8 items-center gap-1 text-sm text-ink-2 transition-colors duration-200 hover:text-ink"
                        >
                          {link.label}
                          <ArrowUpRight
                            size={14}
                            className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                          />
                        </a>
                      </li>
                    ) : (
                      <li key={link.label}>
                        <span
                          className="inline-flex min-h-8 items-center text-sm text-muted/70"
                          title="Not built in this demo"
                        >
                          {link.label}
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} whoareyou. A front-end demo - no data leaves your browser.</p>
          <p className="font-display tracking-wide">Made for people who make things.</p>
        </div>
      </Container>
    </footer>
  )
}
