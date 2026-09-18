import { useState } from "react"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Check } from "@/components/ui/Icon"
import { actionLabel, type Notice } from "@/data/admin"
import { useAdmin } from "@/hooks/useAdmin"
import { navigate } from "@/lib/router"

/**
 * What a moderation decision looks like from the other side.
 *
 * The audit log answers "what did we do"; this answers "what was done to me,
 * and why". They are the same records read from opposite ends, and only the
 * second one discharges the obligation: a reason filed where the author cannot
 * read it is bookkeeping, not a statement of reasons.
 *
 * Appeals go to a differently-named reviewer and, when upheld, actually
 * reverse the action. An appeal that records an outcome without undoing
 * anything would be worse than having no appeal at all, because it would look
 * like recourse.
 */
export function NoticeList({ personId }: { personId: string }) {
  const { noticesFor, markNoticeRead, appealNotice } = useAdmin()
  const notices = noticesFor(personId)

  if (notices.length === 0) return null

  return (
    <section className="mb-10 rounded-card border border-ink bg-ink p-5 text-paper sm:p-6">
      <h2 className="font-display text-base font-semibold">
        {notices.length === 1 ? "A moderation notice" : `${notices.length} moderation notices`}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-paper/70">
        A decision was taken about your work. Here is the reason it was given, and how to contest
        it.
      </p>

      <ul className="mt-5 flex flex-col gap-4">
        {notices.map((notice) => (
          <NoticeRow
            key={notice.id}
            notice={notice}
            onRead={() => markNoticeRead(notice.id)}
            onAppeal={(text) => appealNotice(notice.id, text)}
          />
        ))}
      </ul>
    </section>
  )
}

function NoticeRow({
  notice,
  onRead,
  onAppeal,
}: {
  notice: Notice
  onRead: () => void
  onAppeal: (text: string) => void
}) {
  const [writing, setWriting] = useState(false)
  const [text, setText] = useState("")

  const decided = notice.appeal?.outcome
  const pending = notice.appeal && !decided

  return (
    <li className="rounded-2xl bg-paper/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="border-paper/20 bg-paper/10 text-paper">
          {actionLabel(notice.action)}
        </Badge>
        <span className="font-display text-sm font-semibold">{notice.targetLabel}</span>
        {!notice.readAt && (
          <Badge className="border-ink/20 bg-pop-lime text-ink">New</Badge>
        )}
        <span className="ml-auto font-display text-xs text-paper/50">
          {new Date(notice.at).toLocaleString()}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-paper/85">{notice.reason}</p>

      {notice.target && (
        <button
          type="button"
          onClick={() => {
            onRead()
            navigate(
              notice.target!.kind === "work"
                ? `/panel/portfolio/${notice.target!.id}`
                : `/people/${notice.target!.id}`,
            )
          }}
          className="mt-3 cursor-pointer font-display text-xs font-medium text-pop-lime underline decoration-pop-lime/40 underline-offset-4"
        >
          Open what this is about
        </button>
      )}

      {decided && (
        <div className="mt-4 rounded-xl bg-paper/10 p-3">
          <p className="font-display text-xs font-semibold text-paper">
            Appeal {decided === "overturned" ? "upheld, decision reversed" : "reviewed, decision stands"}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-paper/75">
            {notice.appeal?.outcomeReason}
          </p>
        </div>
      )}

      {pending && (
        <p className="mt-4 flex items-center gap-2 font-display text-xs text-paper/60">
          <Check size={14} />
          Appeal submitted. A reviewer who did not take this decision will look at it.
        </p>
      )}

      {!notice.appeal && (
        <div className="mt-4">
          {writing ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                if (!text.trim()) return
                onAppeal(text)
                setWriting(false)
              }}
            >
              <label className="font-display text-xs font-medium text-paper/70">
                Why is this decision wrong?
                <textarea
                  autoFocus
                  rows={3}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="The figure is in the outcome text, third paragraph. Here is where it came from."
                  className="mt-2 w-full rounded-xl border border-paper/20 bg-ink-2 px-3 py-2 text-sm text-paper placeholder:text-paper/35 focus:border-paper/50 focus:outline-none"
                />
              </label>
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="pop" disabled={!text.trim()}>
                  Send appeal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-paper hover:bg-paper/10"
                  onClick={() => setWriting(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="border-paper/25 bg-transparent text-paper hover:border-paper hover:bg-paper/10"
              onClick={() => {
                onRead()
                setWriting(true)
              }}
            >
              Contest this decision
            </Button>
          )}
        </div>
      )}
    </li>
  )
}
