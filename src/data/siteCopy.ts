/**
 * The strings an admin can change without a deploy.
 *
 * A registry rather than a free-form CMS. Every entry names where it appears
 * and carries the shipped default, so the admin screen can show "this is what
 * it says now, this is what it said originally" and a bad edit is one click
 * from being undone. Components read through `useSite().copy(id)`, which falls
 * back to `defaultValue` - so adding an id here and using it is the whole job,
 * and a missing override can never blank a page.
 *
 * Keep this list short. Every string added is a string someone has to keep
 * true; the answer to "can we make this editable too" is usually no.
 */
export interface CopySlot {
  id: string
  /** Where a reader sees it, so the admin screen is not a list of ids. */
  where: string
  label: string
  defaultValue: string
  /** Rendered as a textarea rather than a single line. */
  long?: boolean
}

export const COPY_SLOTS: CopySlot[] = [
  {
    id: "home.work.description",
    where: "Home, above the portfolio grid",
    label: "Portfolio section description",
    defaultValue:
      "Every entry states the problem, the decisions, and what measurably changed. Narrow by craft, by where it shipped, or by the person who made it.",
    long: true,
  },
  {
    id: "home.directory.description",
    where: "Home, above the people rail",
    label: "Directory section description",
    defaultValue:
      "Same profiles, different rooms. Each category surfaces the people who actually ship in that world.",
    long: true,
  },
  {
    id: "home.roles.description",
    where: "Home, above the craft grid",
    label: "Craft section description",
    defaultValue:
      "Pick a craft to filter the directory. Every profile is tagged by what the person does, not by whatever their offer letter said.",
    long: true,
  },
  {
    id: "footer.blurb",
    where: "Footer, under the wordmark",
    label: "Footer blurb",
    defaultValue:
      "A segmented directory for people who build technology. One profile, sorted by the work you actually do, not by the job title you happened to get.",
    long: true,
  },
  {
    id: "work.index.description",
    where: "Portfolio index, under the heading",
    label: "Portfolio index description",
    defaultValue:
      "Each one states a problem, the decisions behind it, and what measurably changed.",
    long: true,
  },
]

export function copySlotById(id: string): CopySlot | undefined {
  return COPY_SLOTS.find((slot) => slot.id === id)
}
