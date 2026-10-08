import { useNavigate } from "react-router-dom"
import { Avatar } from "@/components/ui/Avatar"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { ArrowUpRight, Check, Plus } from "@/components/ui/Icon"
import { OnboardingChecklist, type OnboardingStep } from "@/components/panel/OnboardingChecklist"
import type { Account, WorkDraft } from "@/data/account"
import { CATEGORIES, roleById } from "@/data/taxonomy"
import type { Author } from "@/lib/authors"
import type { GuestAuthor } from "@/context/BrowseContext"
import { cn, initialsOf } from "@/lib/utils"

const PROFILE_CHECKS: Array<{ label: string; test: (a: Account) => boolean }> = [
  { label: "Name and city", test: (a) => Boolean(a.name && a.location) },
  { label: "Craft and title", test: (a) => Boolean(a.role && a.title) },
  { label: "At least one topic", test: (a) => a.topics.length > 0 },
  { label: "Portfolio link", test: (a) => Boolean(a.portfolio.trim()) },
  {
    label: "One line about your work",
    test: (a) => a.pitch.trim().length >= 20,
  },
]

export function Overview({
  account,
  drafts,
  author,
  profileViews,
  workOpens,
  onboardingHidden,
  onHideOnboarding,
}: {
  account: Account
  drafts: WorkDraft[]
  author: Author | GuestAuthor
  profileViews: number
  workOpens: number
  onboardingHidden: boolean
  onHideOnboarding: () => void
}) {
  const navigate = useNavigate()
  const done = PROFILE_CHECKS.filter((check) => check.test(account))
  const percent = Math.round((done.length / PROFILE_CHECKS.length) * 100)
  const published = drafts.filter((draft) => draft.published)
  const firstDraft = drafts[0]

  const steps: OnboardingStep[] = [
    {
      id: "account",
      label: "Create your profile",
      payoff: "Done at signup.",
      done: true,
    },
    {
      id: "profile",
      label: "Fill in your profile",
      payoff:
        "Craft, topics and a link are what the directory filters on. Without them you are unfindable.",
      done: percent === 100,
      action: { label: "Finish profile", href: "/panel/profile" },
    },
    {
      id: "draft",
      label: "Start your first entry",
      payoff: "Pick a craft and a format. You can save a draft and come back - nothing is lost.",
      done: drafts.length > 0,
      action: { label: "Add work", href: "/panel/portfolio/new" },
    },
    {
      id: "publish",
      label: "Publish it",
      payoff:
        "A published entry is what teams actually browse. One is worth more than a complete profile.",
      done: published.length > 0,
      action: {
        label: "Finish entry",
        href: firstDraft ? `/panel/portfolio/${firstDraft.id}` : "/panel/portfolio/new",
      },
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {!onboardingHidden && (
        <OnboardingChecklist
          steps={steps}
          onDismiss={onHideOnboarding}
          firstName={account.name.split(" ")[0] ?? "there"}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <section className="rounded-card border border-line bg-card p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-base font-semibold tracking-tight">
                Profile strength
              </h2>
              <span className="font-display text-2xl font-bold tracking-tight">{percent}%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-pill bg-paper-2">
              <div
                className="h-full rounded-pill bg-ink transition-[width] duration-500 ease-pop"
                style={{ width: `${percent}%` }}
              />
            </div>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {PROFILE_CHECKS.map((check) => {
                const ok = check.test(account)
                return (
                  <li
                    key={check.label}
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      ok ? "text-ink" : "text-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full",
                        ok ? "bg-pop-lime text-ink" : "border border-dashed border-ink/25",
                      )}
                    >
                      {ok && <Check size={12} />}
                    </span>
                    {check.label}
                  </li>
                )
              })}
            </ul>
            {percent < 100 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-5"
                onClick={() => navigate("/panel/profile")}
              >
                Finish your profile
              </Button>
            )}
          </section>

          <section className="rounded-card border border-line bg-card p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-base font-semibold tracking-tight">Your work</h2>
              <Button size="sm" variant="ghost" onClick={() => navigate("/panel/portfolio")}>
                Manage
                <ArrowUpRight size={15} />
              </Button>
            </div>

            {drafts.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-ink/20 px-5 py-10 text-center">
                <p className="font-display text-sm font-semibold text-ink">Nothing published yet</p>
                <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-muted">
                  A profile without work is a business card. Add one case study - the form asks the
                  right questions for your craft.
                </p>
                <Button size="sm" className="mt-5" onClick={() => navigate("/panel/portfolio/new")}>
                  <Plus size={15} />
                  Add your first entry
                </Button>
              </div>
            ) : (
              <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Published", value: published.length },
                  { label: "Drafts", value: drafts.length - published.length },
                  { label: "Profile views", value: profileViews },
                  { label: "Opens", value: workOpens },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-paper px-4 py-4">
                    <dt className="font-display text-[0.6875rem] tracking-[0.14em] uppercase text-muted">
                      {stat.label}
                    </dt>
                    <dd className="mt-1 font-display text-2xl font-bold tracking-tight">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">Your directory card</p>
          <article className="mt-4 rounded-card border border-line bg-card p-5">
            <div className="flex items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-[30%] bg-ink font-display text-lg font-bold text-paper">
                {initialsOf(account.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-semibold text-ink">
                  {account.name}
                </p>
                <p className="truncate text-sm text-ink-2">{account.title || "Add your title"}</p>
                <p className="mt-1 truncate text-xs text-muted">
                  {account.location} · {account.years || "?"} yrs
                </p>
              </div>
            </div>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              <li>
                <Badge className="border-ink/20 bg-paper-2">{roleById(account.role).label}</Badge>
              </li>
              {account.topics.map((topic) => (
                <li key={topic}>
                  <Badge>{CATEGORIES.find((c) => c.id === topic)?.label}</Badge>
                </li>
              ))}
            </ul>
            {account.pitch.trim() && (
              <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-ink-2">
                "{account.pitch.trim()}"
              </p>
            )}
          </article>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted">
            <Avatar
              src={"photo" in author ? author.photo : undefined}
              name={author.name}
              className="size-5 rounded-full text-[0.5rem]"
            />
            Signed in as {account.email}
          </div>
        </aside>
      </div>
    </div>
  )
}
