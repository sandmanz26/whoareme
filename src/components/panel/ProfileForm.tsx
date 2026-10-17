import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateProfileSchema, type UpdateProfileValues } from "@/lib/validation/authSchemas"
import { AvatarPicker } from "@/components/panel/AvatarPicker"
import { DeleteProfile } from "@/components/panel/DeleteProfile"
import { SkillPicker } from "@/components/panel/SkillPicker"
import { Button } from "@/components/ui/Button"
import { Check } from "@/components/ui/Icon"
import { ChipGroup, Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field"
import type { Account } from "@/data/account"
import { LANGUAGES } from "@/data/people"
import { CATEGORIES, LIVE_ROLES, type CategoryId, type RoleId } from "@/data/taxonomy"
import { cn } from "@/lib/utils"

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ id: c.id, label: c.label }))

export function ProfileForm({
  account,
  onSave,
  onDelete,
}: {
  account: Account
  onSave: (patch: Partial<Account>) => void
  onDelete: () => Promise<void>
}) {
  const [saved, setSaved] = useState(false)

  const form = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: account.name,
      email: account.email,
      location: account.location,
      years: account.years,
      role: account.role,
      title: account.title,
      company: account.company,
      skills: account.skills,
      languages: account.languages,
      openToWork: account.openToWork,
      topics: account.topics,
      portfolio: account.portfolio,
      pitch: account.pitch,
      photo: account.photo ?? "",
    },
  })

  const values = form.watch()
  const { errors } = form.formState

  function onSubmit(data: UpdateProfileValues) {
    onSave(data as Partial<Account>)
    setSaved(true)
  }

  return (
    <form className="grid max-w-2xl gap-5" onSubmit={form.handleSubmit(onSubmit)}>
      <AvatarPicker
        value={values.photo ?? ""}
        name={values.name ?? ""}
        onChange={(photo) => {
          form.setValue("photo", photo)
          setSaved(false)
        }}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name?.message}>
          {({ id, invalid }) => (
            <TextInput
              id={id}
              invalid={invalid}
              value={values.name ?? ""}
              onChange={(e) => form.setValue("name", e.target.value, { shouldValidate: true })}
            />
          )}
        </Field>
        <Field label="Email">
          {({ id, invalid }) => (
            <TextInput
              id={id}
              type="email"
              invalid={invalid}
              value={values.email ?? ""}
              onChange={(e) => form.setValue("email", e.target.value)}
            />
          )}
        </Field>
        <Field label="City & country">
          {({ id, invalid }) => (
            <TextInput
              id={id}
              invalid={invalid}
              value={values.location ?? ""}
              onChange={(e) => form.setValue("location", e.target.value)}
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
              value={values.years ?? ""}
              onChange={(e) => form.setValue("years", e.target.value)}
            />
          )}
        </Field>
        <Field label="Craft">
          {({ id, invalid }) => (
            <SelectInput
              id={id}
              invalid={invalid}
              value={values.role ?? ""}
              placeholder="Select a craft…"
              options={LIVE_ROLES.map((role) => ({
                value: role.id,
                label: role.label,
              }))}
              onChange={(next) => form.setValue("role", next as RoleId)}
            />
          )}
        </Field>
        <Field label="Current title">
          {({ id, invalid }) => (
            <TextInput
              id={id}
              invalid={invalid}
              value={values.title ?? ""}
              onChange={(e) => form.setValue("title", e.target.value)}
            />
          )}
        </Field>
        <Field label="Company" hint="Your employer, studio, or 'Independent'.">
          {({ id, invalid }) => (
            <TextInput
              id={id}
              invalid={invalid}
              value={values.company ?? ""}
              onChange={(e) => form.setValue("company", e.target.value)}
            />
          )}
        </Field>
      </div>

      <ChipGroup
        legend="Topics"
        options={CATEGORY_OPTIONS}
        value={(values.topics ?? []) as CategoryId[]}
        max={4}
        onToggle={(id: CategoryId) => {
          const current = values.topics ?? []
          form.setValue(
            "topics",
            current.includes(id)
              ? current.filter((t) => t !== id)
              : current.length < 4
                ? [...current, id]
                : current,
          )
        }}
        hint="The worlds you have really shipped in. Pick up to 4."
      />

      <SkillPicker
        role={(values.role as RoleId) || account.role}
        value={values.skills ?? []}
        onChange={(skills) => form.setValue("skills", skills)}
        max={24}
      />

      <ChipGroup
        legend="Working languages"
        options={LANGUAGES.map((language) => ({ id: language, label: language }))}
        value={values.languages ?? []}
        max={12}
        onToggle={(language) => {
          const current = values.languages ?? []
          form.setValue(
            "languages",
            current.includes(language)
              ? current.filter((item) => item !== language)
              : [...current, language],
          )
        }}
        hint="Languages you would actually work in."
      />

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-card px-4 py-3">
        <div>
          <p className="font-display text-sm font-medium text-ink">Open to work</p>
          <p className="mt-0.5 text-xs text-muted">
            Shows the availability marker on your cards and profile.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={values.openToWork ?? false}
          onClick={() => form.setValue("openToWork", !(values.openToWork ?? false))}
          className={cn(
            "shrink-0 cursor-pointer rounded-pill border px-3 py-1.5 font-display text-xs font-medium transition-colors duration-200",
            values.openToWork
              ? "border-ink bg-ink text-paper"
              : "border-ink/15 bg-paper-2 text-muted hover:border-ink/40",
          )}
        >
          {values.openToWork ? "On" : "Off"}
        </button>
      </div>

      <Field
        label="Portfolio or profile link"
        hint="Site, GitHub, Dribbble - whatever shows the work."
      >
        {({ id, invalid }) => (
          <TextInput
            id={id}
            type="url"
            invalid={invalid}
            value={values.portfolio ?? ""}
            placeholder="https://"
            onChange={(e) => form.setValue("portfolio", e.target.value)}
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
            value={values.pitch ?? ""}
            placeholder="I turn messy internal tooling into something a team will actually open."
            onChange={(e) => form.setValue("pitch", e.target.value)}
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
            Saved.
          </p>
        )}
      </div>

      <DeleteProfile onDelete={onDelete} />
    </form>
  )
}
