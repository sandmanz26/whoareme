import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Eye } from "@/components/ui/Icon"
import { useAdmin } from "@/hooks/useAdmin"
import { reportReasonLabel, type Report } from "@/data/admin"
import type { Person } from "@/data/people"
import type { Work } from "@/data/work"
import { RULE_LABELS, type Flag, type Severity } from "@/lib/moderation"
import { ActionForm, Empty, Row } from "./primitives"

const SEVERITY_TINT: Record<Severity, string> = {
  high: "border-ink/20 bg-pop-pink",
  medium: "border-ink/20 bg-pop-tangerine",
  low: "border-ink/20 bg-paper-2",
}

export function QueueSection({
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
