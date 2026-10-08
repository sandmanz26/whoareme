import { useState } from "react"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Field, TextArea, TextInput } from "@/components/ui/Field"
import { Check } from "@/components/ui/Icon"
import { useAdmin } from "@/hooks/useAdmin"
import type { SiteContact } from "@/data/admin"
import { COPY_SLOTS } from "@/data/siteCopy"
import { ROLES } from "@/data/taxonomy"
import type { Work } from "@/data/work"
import { cn } from "@/lib/utils"
import { ActionForm } from "./primitives"

export function SiteSection({ allWork }: { allWork: Work[] }) {
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
          Clears the review flags dismissed in this browser. Decisions, reports, settings and the
          audit log live on the server and are not affected.
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
