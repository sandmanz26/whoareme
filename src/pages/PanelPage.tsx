import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PanelShell, type PanelNavItem } from "@/components/panel/PanelShell";
import { WorkStarter } from "@/components/panel/WorkStarter";
import { TrafficPanel } from "@/components/panel/TrafficPanel";
import {
  OnboardingChecklist,
  type OnboardingStep,
} from "@/components/panel/OnboardingChecklist";
import { useOnboarding } from "@/hooks/useOnboarding";
import { WorkEditor } from "@/components/panel/WorkEditor";
import { WorkCover } from "@/components/work/WorkCover";
import { opensByWork } from "@/data/traffic";
import { AvatarPicker } from "@/components/panel/AvatarPicker";
import { NoticeList } from "@/components/panel/NoticeList";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import {
  ChipGroup,
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/ui/Field";
import { ArrowUpRight, Check, Plus } from "@/components/ui/Icon";
import { defaultTemplateId } from "@/data/workTemplates";
import {
  emptyDraft,
  TOPIC_QUOTA,
  topicUsage,
  type Account,
  type WorkDraft,
  type WorkMode,
} from "@/data/account";
import {
  CATEGORIES,
  LIVE_ROLES,
  roleById,
  type CategoryId,
  type RoleId,
} from "@/data/taxonomy";
import { draftCompleteness } from "@/lib/workMapper";
import { totalProfileViews, totalWorkOpens } from "@/data/traffic";
import { useAccount } from "@/hooks/useAccount";
import { api } from "@/lib/api/client";
import { useBrowse } from "@/context/BrowseContext";
import { cn, initialsOf } from "@/lib/utils";
import { applyMeta } from "@/lib/head";
import { track } from "@/lib/analytics";

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ id: c.id, label: c.label }));

export function PanelPage() {
  const { section = "overview", entry } = useParams<{
    section?: string;
    entry?: string;
  }>();
  const navigate = useNavigate();
  const {
    account,
    isInitializing,
    drafts,
    traffic,
    saveDraft,
    deleteDraft,
    updateProfile,
    deleteAccount,
  } = useAccount();
  const { viewerAuthor } = useBrowse();
  const onboarding = useOnboarding();

  useEffect(() => {
    return applyMeta({
      title: "Your panel",
      description: "Your profile, your entries and your traffic.",
      noindex: true,
    });
  }, []);

  useEffect(() => {
    if (section === "portfolio" && entry === "new") {
      track("entry_opened");
    }
  }, [section, entry]);

  if (isInitializing) return null;
  if (!account) return <SignedOut onJoin={() => navigate("/signup")} />;

  const published = drafts.filter((d) => d.published).length;

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
  ];

  if (section === "profile") {
    return (
      <PanelShell
        items={items}
        activeId="profile"
        title="Profile"
        description="How you appear in the directory."
      >
        <ProfileForm
          account={account}
          onSave={updateProfile}
          onDelete={deleteAccount}
        />
      </PanelShell>
    );
  }

  if (section === "traffic") {
    return (
      <PanelShell
        items={items}
        activeId="traffic"
        title="Traffic"
        description="Who is looking, and at what."
      >
        <TrafficPanel traffic={traffic} drafts={drafts} />
      </PanelShell>
    );
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
        opens={opensByWork(traffic)}
        onDelete={deleteDraft}
      />
    );
  }

  return (
    <PanelShell
      items={items}
      activeId="overview"
      title={`Hey, ${account.name.split(" ")[0]}`}
      description="Your profile is live in this browser. Fill it in and publish work to be findable."
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
        profileViews={totalProfileViews(traffic)}
        workOpens={totalWorkOpens(traffic)}
        onboardingHidden={onboarding.hidden}
        onHideOnboarding={onboarding.hide}
      />
    </PanelShell>
  );
}

function VerifyEmailBanner() {
  const [sent, setSent] = useState(false);
  const [working, setWorking] = useState(false);

  async function sendLink() {
    setWorking(true);
    try {
      await api.post("/user/auth/verify/request");
      setSent(true);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mb-4 rounded-card border border-pop-tangerine/40 bg-pop-tangerine/8 px-4 py-3 text-sm">
      {sent ? (
        <p className="text-muted">
          Verification link sent — check your inbox (valid for 24 hours).
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="size-2 shrink-0 rounded-full bg-pop-tangerine" />
            <p className="font-medium text-ink">
              Verify your email to publish work.{" "}
              <span className="font-normal text-muted">
                Without it your entries stay private.
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={sendLink}
            disabled={working}
            className="shrink-0 cursor-pointer rounded-pill border border-pop-tangerine bg-pop-tangerine/10 px-3 py-1.5 font-display text-xs font-semibold text-pop-tangerine transition-colors duration-200 hover:bg-pop-tangerine hover:text-paper disabled:opacity-50"
          >
            {working ? "Sending…" : "Send verification link"}
          </button>
        </div>
      )}
    </div>
  );
}

function SignedOut({ onJoin }: { onJoin: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 text-center">
      <h1 className="display text-3xl">No profile in this browser</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        The panel opens once you create a profile. Everything is stored locally
        - there is no server, so nothing to sign into.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button onClick={onJoin}>Create a profile</Button>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to the directory
        </Button>
      </div>
    </div>
  );
}

const PROFILE_CHECKS: Array<{ label: string; test: (a: Account) => boolean }> =
  [
    { label: "Name and city", test: (a) => Boolean(a.name && a.location) },
    { label: "Craft and title", test: (a) => Boolean(a.role && a.title) },
    { label: "At least one topic", test: (a) => a.topics.length > 0 },
    { label: "Portfolio link", test: (a) => Boolean(a.portfolio.trim()) },
    {
      label: "One line about your work",
      test: (a) => a.pitch.trim().length >= 20,
    },
  ];

function Overview({
  account,
  drafts,
  author,
  profileViews,
  workOpens,
  onboardingHidden,
  onHideOnboarding,
}: {
  account: Account;
  drafts: WorkDraft[];
  author: ReturnType<typeof useBrowse>["viewerAuthor"];
  profileViews: number;
  workOpens: number;
  onboardingHidden: boolean;
  onHideOnboarding: () => void;
}) {
  const navigate = useNavigate();
  const done = PROFILE_CHECKS.filter((check) => check.test(account));
  const percent = Math.round((done.length / PROFILE_CHECKS.length) * 100);
  const published = drafts.filter((draft) => draft.published);
  const firstDraft = drafts[0];

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
      payoff:
        "Pick a craft and a format. You can save a draft and come back - nothing is lost.",
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
        href: firstDraft
          ? `/panel/portfolio/${firstDraft.id}`
          : "/panel/portfolio/new",
      },
    },
  ];

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
              <span className="font-display text-2xl font-bold tracking-tight">
                {percent}%
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-pill bg-paper-2">
              <div
                className="h-full rounded-pill bg-ink transition-[width] duration-500 ease-pop"
                style={{ width: `${percent}%` }}
              />
            </div>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {PROFILE_CHECKS.map((check) => {
                const ok = check.test(account);
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
                        ok
                          ? "bg-pop-lime text-ink"
                          : "border border-dashed border-ink/25",
                      )}
                    >
                      {ok && <Check size={12} />}
                    </span>
                    {check.label}
                  </li>
                );
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
              <h2 className="font-display text-base font-semibold tracking-tight">
                Your work
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/panel/portfolio")}
              >
                Manage
                <ArrowUpRight size={15} />
              </Button>
            </div>

            {drafts.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-ink/20 px-5 py-10 text-center">
                <p className="font-display text-sm font-semibold text-ink">
                  Nothing published yet
                </p>
                <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-muted">
                  A profile without work is a business card. Add one case study
                  - the form asks the right questions for your craft.
                </p>
                <Button
                  size="sm"
                  className="mt-5"
                  onClick={() => navigate("/panel/portfolio/new")}
                >
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
                  <div
                    key={stat.label}
                    className="rounded-2xl bg-paper px-4 py-4"
                  >
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
                <p className="truncate text-sm text-ink-2">
                  {account.title || "Add your title"}
                </p>
                <p className="mt-1 truncate text-xs text-muted">
                  {account.location} · {account.years || "?"} yrs
                </p>
              </div>
            </div>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              <li>
                <Badge className="border-ink/20 bg-paper-2">
                  {roleById(account.role).label}
                </Badge>
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
  );
}

function ProfileForm({
  account,
  onSave,
  onDelete,
}: {
  account: Account;
  onSave: (patch: Partial<Account>) => void;
  onDelete: () => void;
}) {
  const [values, setValues] = useState<Account>(account);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof Account>(key: K, value: Account[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  return (
    <form
      className="grid max-w-2xl gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(values);
        setSaved(true);
      }}
    >
      <AvatarPicker
        value={values.photo ?? ""}
        name={values.name}
        onChange={(photo) => set("photo", photo)}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" required>
          {({ id, invalid }) => (
            <TextInput
              id={id}
              invalid={invalid}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
            />
          )}
        </Field>
        <Field label="Email">
          {({ id, invalid }) => (
            <TextInput
              id={id}
              type="email"
              invalid={invalid}
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
            />
          )}
        </Field>
        <Field label="City & country">
          {({ id, invalid }) => (
            <TextInput
              id={id}
              invalid={invalid}
              value={values.location}
              onChange={(e) => set("location", e.target.value)}
            />
          )}
        </Field>
        <Field label="Years of experience">
          {({ id, invalid }) => (
            <TextInput
              id={id}
              type="number"
              min={0}
              max={60}
              invalid={invalid}
              value={values.years}
              onChange={(e) => set("years", e.target.value)}
            />
          )}
        </Field>
        <Field label="Craft">
          {({ id, invalid }) => (
            <SelectInput
              id={id}
              invalid={invalid}
              value={values.role}
              placeholder="Select a craft…"
              options={LIVE_ROLES.map((role) => ({
                value: role.id,
                label: role.label,
              }))}
              onChange={(next) => set("role", next as RoleId)}
            />
          )}
        </Field>
        <Field label="Current title">
          {({ id, invalid }) => (
            <TextInput
              id={id}
              invalid={invalid}
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
            />
          )}
        </Field>
      </div>

      <ChipGroup
        legend="Topics"
        options={CATEGORY_OPTIONS}
        value={values.topics}
        max={4}
        onToggle={(id: CategoryId) =>
          set(
            "topics",
            values.topics.includes(id)
              ? values.topics.filter((t) => t !== id)
              : values.topics.length < 4
                ? [...values.topics, id]
                : values.topics,
          )
        }
        hint="The worlds you have really shipped in. Pick up to 4."
      />

      <Field
        label="Portfolio or profile link"
        hint="Site, GitHub, Dribbble - whatever shows the work."
      >
        {({ id, invalid }) => (
          <TextInput
            id={id}
            type="url"
            invalid={invalid}
            value={values.portfolio}
            placeholder="https://"
            onChange={(e) => set("portfolio", e.target.value)}
          />
        )}
      </Field>

      <Field
        label="Bio"
        hint="A sentence or two in your own voice. It heads your profile and sits under your name on a card."
      >
        {({ id, invalid }) => (
          <TextArea
            id={id}
            invalid={invalid}
            rows={4}
            value={values.pitch}
            placeholder="I turn messy internal tooling into something a team will actually open."
            onChange={(e) => set("pitch", e.target.value)}
          />
        )}
      </Field>

      <div className="flex items-center gap-4 border-t border-line pt-6">
        <Button type="submit">Save profile</Button>
        {saved && (
          <p
            role="status"
            className="flex items-center gap-1.5 font-display text-sm font-medium text-ink-2"
          >
            <Check size={15} className="text-pop-violet" />
            Saved to this browser.
          </p>
        )}
      </div>

      <DeleteProfile onDelete={onDelete} />
    </form>
  );
}

function DeleteProfile({ onDelete }: { onDelete: () => void }) {
  const navigate = useNavigate();
  const [armed, setArmed] = useState(false);

  return (
    <div className="mt-2 border-t border-line pt-6">
      <p className="font-display text-sm font-semibold text-ink">
        Delete profile
      </p>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
        Removes your profile, every entry and your traffic history from this
        browser. Nothing is kept on a server, so there is no copy to restore
        from and no undo.
      </p>

      {armed ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onDelete();
              navigate("/");
            }}
          >
            Yes, delete everything
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setArmed(false)}
          >
            Keep it
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="mt-4 cursor-pointer font-display text-sm font-medium text-muted underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-pop-pink hover:decoration-pop-pink"
        >
          Delete my profile
        </button>
      )}
    </div>
  );
}

function PortfolioSection({
  entryId,
  items,
  account,
  author,
  drafts,
  onSave,
  onDelete,
  opens,
}: {
  entryId: string | undefined;
  items: PanelNavItem[];
  account: Account;
  author: ReturnType<typeof useBrowse>["viewerAuthor"];
  drafts: WorkDraft[];
  onSave: (draft: WorkDraft) => void;
  onDelete: (id: string) => void;
  opens: Record<string, number>;
}) {
  const navigate = useNavigate();
  const target = entryId;
  const existing = useMemo(
    () => drafts.find((d) => d.id === target),
    [drafts, target],
  );

  const [mode, setMode] = useState<WorkMode>("template");
  const [pendingRole, setPendingRole] = useState<RoleId | null>(null);
  const [newDraft, setNewDraft] = useState<WorkDraft | null>(null);

  const [lastTarget, setLastTarget] = useState(target);
  if (target !== lastTarget) {
    setLastTarget(target);
    if (target === "new") {
      setNewDraft(null);
      setMode("template");
      setPendingRole(null);
    }
  }

  if (target === "new") {
    return (
      <PanelShell
        items={items}
        activeId="portfolio"
        title={newDraft ? "New entry" : "Add work"}
        description={
          newDraft
            ? "Fill in what you can - you can save a draft and come back."
            : "Three choices, then you write."
        }
      >
        {newDraft ? (
          <WorkEditor
            draft={newDraft}
            account={account}
            author={author}
            siblings={drafts}
            onRestart={() => {
              setNewDraft(null);
              setPendingRole(null);
            }}
            onSave={(next) => {
              onSave(next);
              navigate(`/panel/portfolio/${next.id}`);
            }}
          />
        ) : (
          <>
            <WorkStarter
              mode={mode}
              role={pendingRole}
              profileRole={account.role}
              onModeChange={(next) => {
                setMode(next);
                if (next === "custom" && pendingRole) {
                  setNewDraft(
                    emptyDraft(
                      pendingRole,
                      "custom",
                      defaultTemplateId(pendingRole),
                    ),
                  );
                }
              }}
              onRoleSelect={(role) => {
                setPendingRole(role);
                if (mode === "custom")
                  setNewDraft(
                    emptyDraft(role, "custom", defaultTemplateId(role)),
                  );
              }}
              onTemplateSelect={(role, template) =>
                setNewDraft(emptyDraft(role, mode, template))
              }
            />
            <Button
              variant="ghost"
              className="mt-8"
              onClick={() => navigate("/panel/portfolio")}
            >
              Cancel
            </Button>
          </>
        )}
      </PanelShell>
    );
  }

  if (existing) {
    return (
      <PanelShell
        items={items}
        activeId="portfolio"
        title={existing.values.title || "Untitled entry"}
        description={`${roleById(existing.role).label} · ${
          existing.mode === "template" ? "guided template" : "own structure"
        } · ${existing.published ? "published" : "draft"}`}
      >
        <WorkEditor
          draft={existing}
          account={account}
          author={author}
          siblings={drafts}
          onRestart={() => navigate("/panel/portfolio/new")}
          onSave={(next) => onSave(next)}
          onDelete={() => {
            onDelete(existing.id);
            navigate("/panel/portfolio");
          }}
        />
      </PanelShell>
    );
  }

  const usage = topicUsage(drafts);
  const atCap = CATEGORIES.filter(
    (category) => (usage[category.id] ?? 0) >= TOPIC_QUOTA,
  );

  return (
    <PanelShell
      items={items}
      activeId="portfolio"
      title="Portfolio"
      description="Each entry carries its own craft and format - they do not have to match your profile."
      action={
        <Button onClick={() => navigate("/panel/portfolio/new")}>
          <Plus size={16} />
          Add work
        </Button>
      }
    >
      {atCap.length > 0 && (
        <p className="mb-5 rounded-card border border-dashed border-ink/20 px-5 py-3.5 text-xs leading-relaxed text-muted">
          <span className="font-display font-semibold text-ink">
            Topic quota reached
          </span>{" "}
          for {atCap.map((category) => category.label).join(", ")}. Two
          published entries per topic - unpublish one to make room.
        </p>
      )}

      {drafts.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink/20 bg-card px-6 py-16 text-center">
          <h2 className="display text-xl">No entries yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Start with the piece of work you would actually talk about in an
            interview.
          </p>
          <Button
            className="mt-6"
            onClick={() => navigate("/panel/portfolio/new")}
          >
            <Plus size={16} />
            Add your first entry
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3">
          {drafts.map((draft) => {
            const percent = Math.round(draftCompleteness(draft) * 100);
            return (
              <li key={draft.id} className="relative">
                <div className="group flex w-full cursor-pointer flex-col gap-3 rounded-card border border-line bg-card p-5 text-left transition-all duration-250 ease-pop hover:-translate-y-0.5 hover:border-ink/30 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    {draft.thumbnail ? (
                      <img
                        src={draft.thumbnail}
                        alt=""
                        className="hidden aspect-[16/9] w-28 shrink-0 rounded-xl border border-line object-cover sm:block"
                      />
                    ) : (
                      <WorkCover
                        seed={draft.id}
                        role={draft.role}
                        className="hidden aspect-[16/9] w-28 shrink-0 rounded-xl sm:block"
                      />
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border-ink/20 bg-paper-2">
                          {roleById(draft.role).label}
                        </Badge>
                        <Badge
                          className={
                            draft.published
                              ? "border-ink/20 bg-pop-lime text-ink"
                              : "border-dashed border-ink/25 bg-card"
                          }
                        >
                          {draft.published ? "Published" : "Draft"}
                        </Badge>
                        {draft.mode === "custom" && (
                          <Badge>Own structure</Badge>
                        )}
                      </div>
                      <p className="mt-2.5 truncate font-display text-base font-semibold text-ink">
                        {draft.values.title || "Untitled entry"}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted">
                        {draft.values.summary || "No summary yet"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <div className="w-28">
                      <div className="h-1.5 overflow-hidden rounded-pill bg-paper-2">
                        <div
                          className="h-full rounded-pill bg-ink"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="mt-1.5 font-display text-[0.6875rem] text-muted">
                        {percent}% complete
                      </p>
                      {draft.published && (
                        <p className="mt-1 font-display text-[0.6875rem] text-muted">
                          {opens[draft.id] ?? 0}{" "}
                          {(opens[draft.id] ?? 0) === 1 ? "open" : "opens"}
                        </p>
                      )}
                    </div>

                    {draft.published && (
                      <button
                        type="button"
                        onClick={() => onSave({ ...draft, published: false })}
                        className="relative z-10 cursor-pointer rounded-pill border border-ink/15 bg-card px-3 py-2 font-display text-xs font-medium text-ink-2 transition-colors duration-200 hover:border-ink hover:text-ink"
                      >
                        Revert to draft
                        <span className="sr-only">
                          {" "}
                          - {draft.values.title || "Untitled entry"}
                        </span>
                      </button>
                    )}

                    <ArrowUpRight
                      size={18}
                      className="text-muted transition-colors duration-200 group-hover:text-ink"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/panel/portfolio/${draft.id}`)}
                  className="absolute inset-0 cursor-pointer rounded-card"
                >
                  <span className="sr-only">
                    Edit {draft.values.title || "Untitled entry"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PanelShell>
  );
}
