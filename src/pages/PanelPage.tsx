import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { PanelShell, type PanelNavItem } from "@/components/panel/PanelShell"
import { TrafficPanel } from "@/components/panel/TrafficPanel"
import { NoticeList } from "@/components/panel/NoticeList"
import { Overview } from "@/components/panel/Overview"
import { ProfileForm } from "@/components/panel/ProfileForm"
import { DeleteProfile } from "@/components/panel/DeleteProfile"
import { PortfolioSection } from "@/components/panel/PortfolioSection"
import { VerifyEmailBanner } from "@/components/panel/VerifyEmailBanner"
import { Button } from "@/components/ui/Button"
import { Plus } from "@/components/ui/Icon"
import { useAccount } from "@/hooks/useAccount"
import { useMyWork } from "@/hooks/useMyWork"
import { useMyProfile } from "@/hooks/useMyProfile"
import { useTrafficSummary } from "@/hooks/useTrafficSummary"
import { useOnboarding } from "@/hooks/useOnboarding"
import { useBrowse } from "@/context/BrowseContext"
import { applyMeta } from "@/lib/head"
import { track } from "@/lib/analytics"

export function PanelPage() {
  const { section = "overview", entry } = useParams<{
    section?: string
    entry?: string
  }>()
  const navigate = useNavigate()
  const { account, isInitializing, deleteAccount } = useAccount()
  const { drafts, saveDraft, deleteDraft } = useMyWork()
  const { updateProfile } = useMyProfile()
  const trafficSummary = useTrafficSummary()
  const { viewerAuthor, openJoin } = useBrowse()
  const onboarding = useOnboarding()

  useEffect(() => {
    return applyMeta({
      title: "Your panel",
      description: "Your profile, your entries and your traffic.",
      noindex: true,
    })
  }, [])

  useEffect(() => {
    if (section === "portfolio" && entry === "new") {
      track("entry_opened")
    }
  }, [section, entry])

  if (isInitializing) return null
  if (!account) return <SignedOut onJoin={openJoin} />

  const published = drafts.filter((d) => d.published).length

  const items: PanelNavItem[] = [
    { id: "overview", label: "Overview", href: "/panel" },
    { id: "profile", label: "Profile", href: "/panel/profile" },
    {
      id: "portfolio",
      label: "Portfolio",
      href: "/panel/portfolio",
      badge: drafts.length ? `${published}/${drafts.length}` : undefined,
    },
    { id: "traffic", label: "Traffic", href: "/panel/traffic" },
  ]

  // A suspended account keeps one door open: read the decision, appeal it, or
  // leave. Everything else stays closed, which is what the API enforces.
  if (account.status === "suspended") {
    return (
      <PanelShell
        items={items}
        activeId="overview"
        title="Account suspended"
        description="Read the decision, appeal it, or delete your account. Everything else is closed while the suspension stands."
      >
        <div className="flex flex-col gap-6">
          <div className="rounded-card border border-pop-pink/40 bg-pop-pink/8 p-5 text-sm leading-relaxed text-ink-2">
            A moderator suspended your account. The reason is in the notice below. Replying there
            sends the appeal to a different moderator, who reviews the decision.
          </div>
          <NoticeList personId={account.id} />
          <DeleteProfile onDelete={deleteAccount} />
        </div>
      </PanelShell>
    )
  }

  if (section === "profile") {
    return (
      <PanelShell
        items={items}
        activeId="profile"
        title="Profile"
        description="How you appear in the directory."
      >
        <ProfileForm account={account} onSave={updateProfile} onDelete={deleteAccount} />
      </PanelShell>
    )
  }

  if (section === "traffic") {
    return (
      <PanelShell
        items={items}
        activeId="traffic"
        title="Traffic"
        description="Who is looking, and at what."
      >
        <TrafficPanel summary={trafficSummary} drafts={drafts} />
      </PanelShell>
    )
  }

  if (section === "portfolio") {
    return (
      <PortfolioSection
        entryId={entry}
        items={items}
        account={account}
        author={viewerAuthor}
        drafts={drafts}
        onSave={saveDraft}
        opens={trafficSummary.opensBySlug}
        onDelete={deleteDraft}
      />
    )
  }

  return (
    <PanelShell
      items={items}
      activeId="overview"
      title={`Hey, ${account.name.split(" ")[0]}`}
      description="Your profile is live in the directory. Fill it in and publish work to be findable."
      action={
        <Button onClick={() => navigate("/panel/portfolio/new")}>
          <Plus size={16} />
          Add work
        </Button>
      }
    >
      {!account.emailVerifiedAt && <VerifyEmailBanner />}

      <NoticeList personId={account.id} />

      <Overview
        account={account}
        drafts={drafts}
        author={viewerAuthor}
        profileViews={trafficSummary.totals.profileViews}
        workOpens={trafficSummary.totals.workOpens}
        onboardingHidden={onboarding.hidden}
        onHideOnboarding={onboarding.hide}
      />
    </PanelShell>
  )
}

function SignedOut({ onJoin }: { onJoin: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 text-center">
      <h1 className="display text-3xl">No profile yet</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Create a profile to open the panel, then fill in your details and publish work to be
        findable in the directory.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button onClick={onJoin}>Create a profile</Button>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to the directory
        </Button>
      </div>
    </div>
  )
}
