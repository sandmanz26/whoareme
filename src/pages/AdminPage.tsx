import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { PanelShell } from "@/components/panel/PanelShell"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Field, TextArea, TextInput } from "@/components/ui/Field"
import { ArrowUpRight, Check, Eye } from "@/components/ui/Icon"
import { useAdmin } from "@/hooks/useAdmin"
import { actionLabel, reportReasonLabel, type Report, type SiteContact } from "@/data/admin"
import { COPY_SLOTS } from "@/data/siteCopy"
import { ROLES } from "@/data/taxonomy"
import type { Person } from "@/data/people"
import type { Work } from "@/data/work"
import { flagsFor, RULE_LABELS, type Flag, type Severity } from "@/lib/moderation"
import {
  CONVERSIONS,
  FUNNEL_STEPS,
  rate,
  readFunnel,
  resetFunnel,
  type FunnelCounts,
} from "@/lib/analytics"
import { cn } from "@/lib/utils"
import { useBrowse } from "@/context/BrowseContext"
import { applyMeta } from "@/lib/head"

const SEVERITY_TINT: Record<Severity, string> = {
  high: "border-ink/20 bg-pop-pink",
  medium: "border-ink/20 bg-pop-tangerine",
  low: "border-ink/20 bg-paper-2",
}

function ActionForm({
  label,
  placeholder,
  destructive,
  onSubmit,
}: {
  label: string
  placeholder: string
  destructive?: boolean
  onSubmit: (reason: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")

  if (!open) {
    return (
      <Button size="sm" variant={destructive ? "primary" : "outline"} onClick={() => setOpen(true)}>
        {label}
      </Button>
    )
  }

  return (
    <form
      className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(reason)
        setReason("")
        setOpen(false)
      }}
    >
      <input
        autoFocus
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder={placeholder}
        aria-label={`Reason for: ${label}`}
        className="h-10 min-w-0 flex-1 rounded-pill border border-ink/15 bg-card px-4 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
      />
      <div className="flex shrink-0 gap-2">
        <Button size="sm" type="submit" variant={destructive ? "primary" : "pop"}>
          {label}
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function Row({
  title,
  meta,
  children,
  tint,
}: {
  title: string
  meta: string
  children: React.ReactNode
  tint?: string
}) {
  return (
    <li className="flex flex-col gap-3 border-t border-line py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{meta}</p>
        </div>
        {tint && (
          <Badge className={tint}>
            {tint.includes("pink") ? "High" : tint.includes("tangerine") ? "Medium" : "Low"}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </li>
  )
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-card border border-dashed border-ink/20 px-6 py-12 text-center">
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{body}</p>
    </div>
  )
}

export function AdminPage() {
  const { tab } = useParams<{ tab?: string }>()
  const section = tab ?? "queue"
  const admin = useAdmin()
  const { rawWork: allWork, rawPeople: allPeople } = useBrowse()

  useEffect(() => {
    return applyMeta({
      title: "Moderation",
      description: "Review queue, entries, people and the audit log.",
      noindex: true,
    })
  }, [])

  const flags = useMemo(() => flagsFor(allWork, allPeople), [allWork, allPeople])
  const openFlags = flags.filter((flag) => !admin.state.reviewed.includes(flag.key))
  const openAppeals = admin.state.notices.filter(
    (notice) => notice.appeal && !notice.appeal.outcome,
  )
  const queueSize = openFlags.length + admin.state.reports.length + openAppeals.length

  const items = [
    {
      id: "queue",
      label: "Review queue",
      href: "/admin",
      badge: queueSize ? String(queueSize) : undefined,
    },
    { id: "entries", label: "Entries", href: "/admin/entries", badge: String(allWork.length) },
    { id: "people", label: "People", href: "/admin/people", badge: String(allPeople.length) },
    { id: "funnel", label: "Funnel", href: "/admin/funnel" },
    { id: "site", label: "Site settings", href: "/admin/site" },
    {
      id: "log",
      label: "Audit log",
      href: "/admin/log",
      badge: admin.state.log.length ? String(admin.state.log.length) : undefined,
    },
  ]

  const titles: Record<string, { title: string; description: string }> = {
    queue: {
      title: "Review queue",
      description:
        "Everything the rules flagged, plus what readers reported. Acting on an item, or marking it reviewed, takes it off this list.",
    },
    entries: {
      title: "Entries",
      description: "Every case study in the directory, including the ones already withheld.",
    },
    people: {
      title: "People",
      description: "Everyone listed, including suspended profiles.",
    },
    funnel: {
      title: "Funnel",
      description:
        "Named steps, counted. No cookies, no third-party script, nothing about who did what. In this build the counters are from this browser only.",
    },
    site: {
      title: "Site settings",
      description:
        "Contact details, the copy that can change without a deploy, and which crafts are offered.",
    },
    log: {
      title: "Audit log",
      description: "Every moderation decision, with the reason given at the time. Newest first.",
    },
  }

  const head = titles[section] ?? titles.queue

  return (
    <PanelShell
      eyebrow="Moderation"
      items={items}
      activeId={section}
      title={head.title}
      description={head.description}
    >
      <div className="mb-8 rounded-card border border-ink bg-ink p-5 text-paper">
        <p className="font-display text-sm font-semibold">This console has no access control.</p>
        <p className="mt-2 text-sm leading-relaxed text-paper/75">
          Anyone who can open this build can open this page, and every decision is stored in your
          own browser only. The API in <code>/server</code> is where the real gate lives: an admin
          role on a verified token, checked per request. Treat this as the interface, not the
          boundary.
        </p>
      </div>

      {section === "queue" && (
        <QueueSection
          flags={openFlags}
          reports={admin.state.reports}
          allWork={allWork}
          allPeople={allPeople}
        />
      )}
      {section === "entries" && <EntriesSection allWork={allWork} />}
      {section === "people" && <PeopleSection allPeople={allPeople} allWork={allWork} />}
      {section === "funnel" && <FunnelSection />}
      {section === "site" && <SiteSection allWork={allWork} />}
      {section === "log" && <LogSection />}
    </PanelShell>
  )
}

function QueueSection({
  flags,
  reports,
  allWork,
  allPeople,
}: {
  flags: Flag[]
  reports: Report[]
  allWork: Work[]
  allPeople: Person[]
}) {
  const navigate = useNavigate()
  const admin = useAdmin()
  const workById = new Map(allWork.map((item) => [item.id, item]))
  const peopleById = new Map(allPeople.map((item) => [item.id, item]))

  const appeals = admin.state.notices.filter((notice) => notice.appeal && !notice.appeal.outcome)

  if (flags.length === 0 && reports.length === 0 && appeals.length === 0) {
    return (
      <Empty
        title="Nothing waiting"
        body="No rule is firing, nobody has reported anything, and no decision is being contested. An empty queue is the point, not a bug."
      />
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {appeals.length > 0 && (
        <section>
          <h2 className="display text-xl">Appeals ({appeals.length})</h2>
          <p className="mt-2 text-sm text-muted">
            Someone's work is withheld while this waits, so it goes first. Overturning actually puts
            the entry back; upholding leaves it down and tells them why.
          </p>
          <ul className="mt-4">
            {appeals.map((notice) => (
              <Row
                key={notice.id}
                title={notice.targetLabel}
                meta={`Our reason: "${notice.reason}" · Their case: "${notice.appeal?.text}"`}
              >
                {notice.target && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      navigate(
                        notice.target!.kind === "work"
                          ? `/work/${notice.target!.id}`
                          : `/people/${notice.target!.id}`,
                      )
                    }
                  >
                    <Eye size={15} />
                    Open
                  </Button>
                )}
                <ActionForm
                  label="Overturn"
                  placeholder="What did they show you that changed it?"
                  onSubmit={(reason) => admin.decideAppeal(notice.id, "overturned", reason)}
                />
                <ActionForm
                  label="Uphold"
                  destructive
                  placeholder="Why does the decision stand?"
                  onSubmit={(reason) => admin.decideAppeal(notice.id, "upheld", reason)}
                />
              </Row>
            ))}
          </ul>
        </section>
      )}

      {reports.length > 0 && (
        <section>
          <h2 className="display text-xl">Reported by readers ({reports.length})</h2>
          <p className="mt-2 text-sm text-muted">
            A person decided something here was wrong. Read the entry before acting.
          </p>
          <ul className="mt-4">
            {reports.map((report) => {
              const label =
                report.target.kind === "work"
                  ? (workById.get(report.target.id)?.title ?? report.target.id)
                  : (peopleById.get(report.target.id)?.name ?? report.target.id)
              return (
                <Row
                  key={report.id}
                  title={label}
                  meta={`${reportReasonLabel(report.reason)}${report.note ? ` · "${report.note}"` : ""} · ${new Date(report.createdAt).toLocaleString()}`}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      navigate(
                        report.target.kind === "work"
                          ? `/work/${report.target.id}`
                          : `/people/${report.target.id}`,
                      )
                    }
                  >
                    <Eye size={15} />
                    Open
                  </Button>
                  {report.target.kind === "work" ? (
                    <ActionForm
                      label="Unpublish"
                      destructive
                      placeholder="Why is this coming down?"
                      onSubmit={(reason) =>
                        admin.setWorkHidden(
                          report.target.id,
                          true,
                          label,
                          reason,
                          workById.get(report.target.id)?.authorId,
                        )
                      }
                    />
                  ) : (
                    <ActionForm
                      label="Suspend"
                      destructive
                      placeholder="Why is this profile being withheld?"
                      onSubmit={(reason) =>
                        admin.setPersonSuspended(report.target.id, true, label, reason)
                      }
                    />
                  )}
                  <ActionForm
                    label="Close report"
                    placeholder="What did you decide, and why?"
                    onSubmit={(reason) => admin.resolveReport(report.id, reason)}
                  />
                </Row>
              )
            })}
          </ul>
        </section>
      )}

      {flags.length > 0 && <FlagGroups flags={flags} allWork={allWork} />}
    </div>
  )
}

function FlagGroups({ flags, allWork }: { flags: Flag[]; allWork: Work[] }) {
  const navigate = useNavigate()
  const admin = useAdmin()
  const [openRule, setOpenRule] = useState<string | null>(null)
  const workById = new Map(allWork.map((item) => [item.id, item]))

  const groups = new Map<string, Flag[]>()
  for (const flag of flags) {
    groups.set(flag.ruleId, [...(groups.get(flag.ruleId) ?? []), flag])
  }

  return (
    <section>
      <h2 className="display text-xl">Flagged by the rules ({flags.length})</h2>
      <p className="mt-2 text-sm text-muted">
        Mechanical checks only. A flag is a prompt to look, not a verdict.
      </p>

      <ul className="mt-4">
        {[...groups].map(([ruleId, items]) => {
          const expanded = openRule === ruleId
          const severity = items[0].severity
          return (
            <li key={ruleId} className="border-t border-line py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold text-ink">
                    {RULE_LABELS[ruleId] ?? ruleId}{" "}
                    <span className="text-muted">({items.length})</span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{items[0].detail}</p>
                </div>
                <Badge className={SEVERITY_TINT[severity]}>
                  {severity === "high" ? "High" : severity === "medium" ? "Medium" : "Low"}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpenRule(expanded ? null : ruleId)}
                >
                  {expanded ? "Hide" : `Show ${items.length}`}
                </Button>
                <ActionForm
                  label={`Mark all ${items.length} reviewed`}
                  placeholder="Why is this acceptable across the board?"
                  onSubmit={(reason) => {
                    for (const flag of items) {
                      admin.dismiss(flag.key, flag.targetLabel, reason)
                    }
                    setOpenRule(null)
                  }}
                />
              </div>

              {expanded && (
                <ul className="mt-2 pl-4">
                  {items.map((flag) => (
                    <Row key={flag.key} title={flag.targetLabel} meta={flag.detail}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          navigate(
                            flag.target.kind === "work"
                              ? `/work/${flag.target.id}`
                              : `/people/${flag.target.id}`,
                          )
                        }
                      >
                        <Eye size={15} />
                        Open
                      </Button>
                      {flag.target.kind === "work" ? (
                        <ActionForm
                          label="Unpublish"
                          destructive
                          placeholder="Why is this coming down?"
                          onSubmit={(reason) =>
                            admin.setWorkHidden(
                              flag.target.id,
                              true,
                              flag.targetLabel,
                              reason,
                              workById.get(flag.target.id)?.authorId,
                            )
                          }
                        />
                      ) : (
                        <ActionForm
                          label="Suspend"
                          destructive
                          placeholder="Why is this profile being withheld?"
                          onSubmit={(reason) =>
                            admin.setPersonSuspended(flag.target.id, true, flag.targetLabel, reason)
                          }
                        />
                      )}
                      <ActionForm
                        label="Mark reviewed"
                        placeholder="Why is this acceptable?"
                        onSubmit={(reason) => admin.dismiss(flag.key, flag.targetLabel, reason)}
                      />
                    </Row>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function EntriesSection({ allWork }: { allWork: Work[] }) {
  const navigate = useNavigate()
  const admin = useAdmin()
  const [query, setQuery] = useState("")
  const [onlyHidden, setOnlyHidden] = useState(false)

  const shown = allWork.filter((item) => {
    if (onlyHidden && !admin.isWorkHidden(item.id)) return false
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return `${item.title} ${item.summary} ${item.authorId}`.toLowerCase().includes(needle)
  })

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search entries"
          aria-label="Search entries"
          className="h-11 flex-1 rounded-pill border border-ink/15 bg-card px-4 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
        <button
          type="button"
          aria-pressed={onlyHidden}
          onClick={() => setOnlyHidden((current) => !current)}
          className={cn(
            "h-11 shrink-0 cursor-pointer rounded-pill border px-4 font-display text-sm font-medium transition-colors duration-200",
            onlyHidden
              ? "border-ink bg-ink text-paper"
              : "border-ink/15 bg-card text-ink-2 hover:border-ink/40",
          )}
        >
          Withheld only ({admin.state.hiddenWork.length})
        </button>
      </div>

      <p className="mt-4 text-sm text-muted">
        <span className="font-display font-semibold text-ink">{shown.length}</span> of{" "}
        {allWork.length} entries
      </p>

      <ul className="mt-2">
        {shown.map((item) => {
          const hidden = admin.isWorkHidden(item.id)
          return (
            <Row
              key={item.id}
              title={item.title}
              meta={`${item.authorId} · ${item.year} · ${hidden ? "withheld from the directory" : "live"}`}
            >
              <Button size="sm" variant="ghost" onClick={() => navigate(`/work/${item.id}`)}>
                <Eye size={15} />
                Open
              </Button>
              {hidden ? (
                <ActionForm
                  label="Republish"
                  placeholder="Why is this going back up?"
                  onSubmit={(reason) =>
                    admin.setWorkHidden(item.id, false, item.title, reason, item.authorId)
                  }
                />
              ) : (
                <ActionForm
                  label="Unpublish"
                  destructive
                  placeholder="Why is this coming down?"
                  onSubmit={(reason) =>
                    admin.setWorkHidden(item.id, true, item.title, reason, item.authorId)
                  }
                />
              )}
            </Row>
          )
        })}
      </ul>
      {shown.length === 0 && (
        <Empty title="No entries match" body="Clear the search or the withheld filter." />
      )}
    </div>
  )
}

function PeopleSection({ allPeople, allWork }: { allPeople: Person[]; allWork: Work[] }) {
  const navigate = useNavigate()
  const admin = useAdmin()
  const [query, setQuery] = useState("")

  const counts = new Map<string, number>()
  for (const item of allWork) counts.set(item.authorId, (counts.get(item.authorId) ?? 0) + 1)

  const shown = allPeople.filter((person) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return `${person.name} ${person.title} ${person.company} ${person.location}`
      .toLowerCase()
      .includes(needle)
  })

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search people"
        aria-label="Search people"
        className="h-11 w-full rounded-pill border border-ink/15 bg-card px-4 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
      />

      <p className="mt-4 text-sm text-muted">
        <span className="font-display font-semibold text-ink">{shown.length}</span> of{" "}
        {allPeople.length} people · {admin.state.suspendedPeople.length} suspended
      </p>

      <ul className="mt-2">
        {shown.map((person) => {
          const suspended = admin.isPersonSuspended(person.id)
          const entries = counts.get(person.id) ?? 0
          return (
            <Row
              key={person.id}
              title={person.name}
              meta={`${person.title} · ${person.company} · ${entries} ${entries === 1 ? "entry" : "entries"}${suspended ? " · suspended" : ""}`}
            >
              <Button size="sm" variant="ghost" onClick={() => navigate(`/people/${person.id}`)}>
                <Eye size={15} />
                Open
              </Button>
              {suspended ? (
                <ActionForm
                  label="Reinstate"
                  placeholder="Why is this profile coming back?"
                  onSubmit={(reason) =>
                    admin.setPersonSuspended(person.id, false, person.name, reason)
                  }
                />
              ) : (
                <ActionForm
                  label="Suspend"
                  destructive
                  placeholder="Why is this profile being withheld?"
                  onSubmit={(reason) =>
                    admin.setPersonSuspended(person.id, true, person.name, reason)
                  }
                />
              )}
            </Row>
          )
        })}
      </ul>
    </div>
  )
}

function FunnelSection() {
  const [counts, setCounts] = useState<FunnelCounts>(() => readFunnel())

  const byStage = FUNNEL_STEPS.reduce<Record<string, (typeof FUNNEL_STEPS)[number][]>>(
    (groups, step) => {
      groups[step.stage] = [...(groups[step.stage] ?? []), step]
      return groups
    },
    {},
  )
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0)

  if (total === 0) {
    return (
      <Empty
        title="No events yet"
        body="Sign up, open the entry form or run a search, then come back. Counters are per browser in this build."
      />
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="display text-xl">Conversion</h2>
        <ul className="mt-4">
          {CONVERSIONS.map((conversion) => {
            const value = rate(counts, conversion)
            const from = counts[conversion.from] ?? 0
            const to = counts[conversion.to] ?? 0
            return (
              <li key={conversion.label} className="border-t border-line py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="font-display text-sm font-semibold text-ink">{conversion.label}</p>
                  <p className="font-display text-sm text-muted">
                    {value === null ? (
                      "no data yet"
                    ) : (
                      <>
                        <span className="display text-xl text-ink">{value}%</span>{" "}
                        <span>
                          ({to} of {from})
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{conversion.why}</p>
              </li>
            )
          })}
        </ul>
      </section>

      {Object.entries(byStage).map(([stage, steps]) => (
        <section key={stage}>
          <h2 className="display text-xl capitalize">{stage}</h2>
          <ul className="mt-4">
            {steps.map((step) => (
              <li
                key={step.id}
                className="flex items-baseline justify-between gap-4 border-t border-line py-3"
              >
                <span className="text-sm text-ink-2">{step.label}</span>
                <span className="font-display text-sm font-semibold text-ink">
                  {counts[step.id] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="border-t border-line pt-8">
        <h2 className="display text-xl">What this is not</h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
          Counters, not an event stream. There is no identifier, no timestamp per event, no path or
          referrer, and no third-party script. Two people who published an entry are
          indistinguishable here, which is enough to answer "do people finish" and not enough to
          reconstruct anyone's session.
        </p>
        <div className="mt-4">
          <ActionForm
            label="Reset counters"
            placeholder="Note for the record, then confirm"
            onSubmit={() => {
              resetFunnel()
              setCounts({})
            }}
          />
        </div>
      </section>
    </div>
  )
}

function SiteSection({ allWork }: { allWork: Work[] }) {
  const admin = useAdmin()
  const [contact, setContactDraft] = useState<SiteContact>(admin.state.contact)
  const [saved, setSaved] = useState(false)

  const roleCounts = new Map<string, number>()
  for (const item of allWork) roleCounts.set(item.role, (roleCounts.get(item.role) ?? 0) + 1)

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h2 className="display text-xl">Contact</h2>
        <p className="mt-2 text-sm text-muted">Shown in the footer and on the privacy page.</p>
        <form
          className="mt-5 flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            admin.setContact(contact)
            setSaved(true)
          }}
        >
          <Field label="Contact email">
            {({ id, invalid }) => (
              <TextInput
                id={id}
                type="email"
                invalid={invalid}
                value={contact.email}
                onChange={(event) => {
                  setContactDraft({ ...contact, email: event.target.value })
                  setSaved(false)
                }}
              />
            )}
          </Field>
          <Field label="Location">
            {({ id, invalid }) => (
              <TextInput
                id={id}
                invalid={invalid}
                value={contact.location}
                onChange={(event) => {
                  setContactDraft({ ...contact, location: event.target.value })
                  setSaved(false)
                }}
              />
            )}
          </Field>
          <Field label="Response expectation" hint="Say something you can actually keep.">
            {({ id, invalid }) => (
              <TextInput
                id={id}
                invalid={invalid}
                value={contact.responseTime}
                onChange={(event) => {
                  setContactDraft({ ...contact, responseTime: event.target.value })
                  setSaved(false)
                }}
              />
            )}
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm">
              Save contact
            </Button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 font-display text-sm text-muted">
                <Check size={15} />
                Saved
              </span>
            )}
          </div>
        </form>
      </section>

      <section>
        <h2 className="display text-xl">Editable copy</h2>
        <p className="mt-2 text-sm text-muted">
          A short registry, not a free-form CMS. Every string added here is a string someone has to
          keep true.
        </p>
        <div className="mt-5 flex flex-col gap-8">
          {COPY_SLOTS.map((slot) => (
            <CopyEditor key={slot.id} slotId={slot.id} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="display text-xl">Crafts offered</h2>
        <p className="mt-2 text-sm text-muted">
          Turning a craft off removes it from the craft grid and the filters. Entries keep their
          craft and stay readable, because withdrawing a way in is not the same as deleting work.
        </p>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {ROLES.map((role) => {
            const disabled = admin.isRoleDisabled(role.id)
            const count = roleCounts.get(role.id) ?? 0
            return (
              <li
                key={role.id}
                className="flex items-center justify-between gap-3 rounded-card border border-line bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold text-ink">{role.label}</p>
                  <p className="text-xs text-muted">
                    {count} {count === 1 ? "entry" : "entries"}
                    {disabled && " · hidden from browse"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!disabled}
                  onClick={() => admin.setRoleDisabled(role.id, !disabled, role.label)}
                  className={cn(
                    "shrink-0 cursor-pointer rounded-pill border px-3 py-1.5 font-display text-xs font-medium transition-colors duration-200",
                    disabled
                      ? "border-ink/15 bg-paper-2 text-muted hover:border-ink/40"
                      : "border-ink bg-ink text-paper",
                  )}
                >
                  {disabled ? "Off" : "On"}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="border-t border-line pt-8">
        <h2 className="display text-xl">Reset</h2>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Clears every moderation decision, report, setting and log line from this browser. The
          seeded fixtures are untouched, because nothing here ever edited them.
        </p>
        <div className="mt-4">
          <ActionForm
            label="Reset everything"
            destructive
            placeholder="Type a note for the record, then confirm"
            onSubmit={() => admin.resetAll()}
          />
        </div>
      </section>
    </div>
  )
}

function CopyEditor({ slotId }: { slotId: string }) {
  const admin = useAdmin()
  const slot = COPY_SLOTS.find((item) => item.id === slotId)!
  const current = admin.copy(slotId)
  const [draft, setDraft] = useState(current)
  const overridden = admin.state.copy[slotId] !== undefined
  const dirty = draft !== current

  return (
    <div className="border-t border-line pt-5">
      <Field label={slot.label} hint={slot.where}>
        {({ id, invalid }) =>
          slot.long ? (
            <TextArea
              id={id}
              rows={3}
              invalid={invalid}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          ) : (
            <TextInput
              id={id}
              invalid={invalid}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          )
        }
      </Field>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={!dirty} onClick={() => admin.setCopy(slotId, draft)}>
          Save
        </Button>
        {overridden && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              admin.setCopy(slotId, "")
              setDraft(slot.defaultValue)
            }}
          >
            Reset to default
          </Button>
        )}
        {overridden && <Badge className="border-ink/20 bg-pop-lime">Edited</Badge>}
      </div>
    </div>
  )
}

function LogSection() {
  const navigate = useNavigate()
  const admin = useAdmin()

  if (admin.state.log.length === 0) {
    return (
      <Empty
        title="No decisions yet"
        body="Every unpublish, suspension, dismissal and settings change lands here with the reason given at the time."
      />
    )
  }

  return (
    <ul>
      {admin.state.log.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-1 border-t border-line py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-ink/20 bg-paper-2">{actionLabel(entry.action)}</Badge>
            <span className="font-display text-sm font-semibold text-ink">{entry.targetLabel}</span>
            {entry.target && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    entry.target!.kind === "work"
                      ? `/work/${entry.target!.id}`
                      : `/people/${entry.target!.id}`,
                  )
                }
                className="inline-flex cursor-pointer items-center gap-1 font-display text-xs font-medium text-muted transition-colors duration-200 hover:text-ink"
              >
                Open
                <ArrowUpRight size={13} />
              </button>
            )}
          </div>
          <p className="text-sm leading-relaxed text-ink-2">{entry.reason}</p>
          <p className="text-xs text-muted">
            {new Date(entry.at).toLocaleString()} · {entry.by}
          </p>
        </li>
      ))}
    </ul>
  )
}
