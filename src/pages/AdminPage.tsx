import { useEffect, useMemo } from "react"
import { useParams } from "react-router-dom"
import { PanelShell } from "@/components/panel/PanelShell"
import { useAdmin } from "@/hooks/useAdmin"
import { flagsFor } from "@/lib/moderation"
import { useBrowse } from "@/context/BrowseContext"
import { applyMeta } from "@/lib/head"
import { QueueSection } from "@/components/admin/ReviewQueue"
import { EntriesSection } from "@/components/admin/EntriesTable"
import { PeopleSection } from "@/components/admin/PeopleTable"
import { FunnelSection } from "@/components/admin/FunnelSection"
import { SiteSection } from "@/components/admin/SiteSection"
import { LogSection } from "@/components/admin/AuditLog"

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
        "Named steps, counted. No cookies, no third-party script, nothing about who did what. Counters are aggregated on the server across everyone.",
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

  if (admin.isLoading) {
    return (
      <PanelShell
        eyebrow="Moderation"
        items={items}
        activeId={section}
        title={head.title}
        description={head.description}
      >
        <p className="py-16 text-center text-sm text-muted">Loading the moderation data…</p>
      </PanelShell>
    )
  }

  if (admin.isError) {
    return (
      <PanelShell
        eyebrow="Moderation"
        items={items}
        activeId={section}
        title={head.title}
        description={head.description}
      >
        <div className="rounded-card border border-dashed border-ink/20 px-6 py-16 text-center">
          <p className="font-display text-base font-semibold text-ink">
            Could not load moderation data
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            The API did not answer. Reload the page to try again.
          </p>
        </div>
      </PanelShell>
    )
  }

  return (
    <PanelShell
      eyebrow="Moderation"
      items={items}
      activeId={section}
      title={head.title}
      description={head.description}
    >
      <div className="mb-8 rounded-card border border-ink bg-ink p-5 text-paper">
        <p className="font-display text-sm font-semibold">Moderation is enforced by the API.</p>
        <p className="mt-2 text-sm leading-relaxed text-paper/75">
          Decisions, reports, notices and settings live on the server. Every moderator route is
          gated by <code>isAuth("moderator")</code> on a verified token, checked per request. This
          console is the interface; the API is the boundary.
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
