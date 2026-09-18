import { CATEGORIES, LIVE_ROLES, type CategoryId, type RoleId } from "@/data/taxonomy"
import { passwordProblem } from "@/lib/password"

export interface JoinValues {
  name: string
  email: string
  location: string
  role: RoleId | ""
  title: string
  years: string
  categories: CategoryId[]
  portfolio: string
  pitch: string
  /** Asked for on the last step: it guards the way back in, not the signup. */
  password: string
}

export const EMPTY_JOIN_VALUES: JoinValues = {
  name: "",
  email: "",
  location: "",
  role: "",
  title: "",
  years: "",
  categories: [],
  portfolio: "",
  pitch: "",
  password: "",
}

export const STEPS = [
  { id: "identity", label: "You", hint: "The basics" },
  { id: "craft", label: "Craft", hint: "What you do" },
  { id: "work", label: "Work", hint: "Proof" },
] as const

export type StepIndex = 0 | 1 | 2

export type JoinErrors = Partial<Record<keyof JoinValues, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const URL_LIKE = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#][^\s]*)?$/

/** Only crafts that are open: signing up as a craft you cannot file work
 *  under would be a dead end. */
export const ROLE_OPTIONS = LIVE_ROLES.map((role) => ({ id: role.id, label: role.label }))
export const CATEGORY_OPTIONS = CATEGORIES.map((category) => ({
  id: category.id,
  label: category.label,
}))

/**
 * Validation lives next to the shape it validates, one pure function per
 * step. Nothing here touches the DOM, so the rules stay easy to reason about.
 */
export function validateStep(step: StepIndex, values: JoinValues): JoinErrors {
  const errors: JoinErrors = {}

  if (step === 0) {
    if (!values.name.trim()) errors.name = "We need a name to put on the profile."
    if (!values.email.trim()) errors.email = "An email is required."
    else if (!EMAIL.test(values.email.trim())) errors.email = "That email does not look right."
    if (!values.location.trim()) errors.location = "Add a city so teams can filter by location."
  }

  if (step === 1) {
    if (!values.role) errors.role = "Pick the craft you want to be found for."
    if (!values.title.trim()) errors.title = "Add the title you actually use."
    const years = Number(values.years)
    if (!values.years.trim()) errors.years = "Roughly how long have you been at it?"
    else if (!Number.isFinite(years) || years < 0 || years > 60)
      errors.years = "Enter a number between 0 and 60."
    if (values.categories.length === 0) errors.categories = "Choose at least one category."
    else if (values.categories.length > 4) errors.categories = "Four categories max - stay sharp."
  }

  if (step === 2) {
    if (!values.portfolio.trim()) errors.portfolio = "Link something we can look at."
    else if (!URL_LIKE.test(values.portfolio.trim())) errors.portfolio = "That does not look like a URL."
    if (values.pitch.trim().length > 0 && values.pitch.trim().length < 20)
      errors.pitch = "Either say something real (20+ characters) or leave it blank."
    const passwordIssue = passwordProblem(values.password)
    if (passwordIssue) errors.password = passwordIssue
  }

  return errors
}
