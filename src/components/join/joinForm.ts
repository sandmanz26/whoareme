import { LIVE_ROLES, type RoleId } from "@/data/taxonomy"
import { passwordProblem } from "@/lib/password"

export interface JoinValues {
  name: string
  email: string
  role: RoleId | ""
  /** Guards the way back in. */
  password: string
}

export const EMPTY_JOIN_VALUES: JoinValues = {
  name: "",
  email: "",
  role: "",
  password: "",
}

export type JoinErrors = Partial<Record<keyof JoinValues, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Only crafts that are open: signing up as a craft you cannot file work
 *  under would be a dead end. */
export const ROLE_OPTIONS = LIVE_ROLES.map((role) => ({ id: role.id, label: role.label }))

/**
 * Signup asks for exactly what a name badge needs: who you are, how to get
 * back in, and which craft you show up under. Location, title, topics, a
 * portfolio link and a bio all have a place on the profile form and a
 * graceful "add yours" fallback until then - asking for them here would be
 * asking twice for something that only needs answering once.
 */
export function validateJoin(values: JoinValues): JoinErrors {
  const errors: JoinErrors = {}

  if (!values.name.trim()) errors.name = "We need a name to put on the profile."
  if (!values.email.trim()) errors.email = "An email is required."
  else if (!EMAIL.test(values.email.trim())) errors.email = "That email does not look right."
  if (!values.role) errors.role = "Pick the craft you want to be found for."

  const passwordIssue = passwordProblem(values.password)
  if (passwordIssue) errors.password = passwordIssue

  return errors
}
