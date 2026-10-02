export const SUCCESS_CREATE = (name: string) => `${name} created successfully.`
export const SUCCESS_UPDATE = (name: string) => `${name} updated successfully.`
export const SUCCESS_DELETE = (name: string) => `${name} deleted successfully.`
export const SUCCESS_GET = (name: string) => `${name} retrieved successfully.`
export const SUCCESS_LOGIN = "Logged in successfully."
export const SUCCESS_LOGOUT = "Logged out successfully."
export const SUCCESS_REGISTER = "Account created successfully."
export const SUCCESS_PUBLISH = "Entry published successfully."
export const SUCCESS_UNPUBLISH = "Entry unpublished successfully."
export const SUCCESS_VERIFIED = "Email verified successfully."
export const SUCCESS_APPEAL = "Appeal submitted successfully."

export const ERR_NOT_FOUND = (name: string) => `${name} not found.`
export const ALREADY_EXIST = (name: string) => `${name} already exists.`
export const ERR_UNAUTHORIZED = "Unauthorized. Please sign in."
export const ERR_FORBIDDEN = "You do not have permission to perform this action."
export const ERR_INVALID_CREDS = "Email or password is incorrect."
export const ERR_EMAIL_UNVERIFIED =
  "Confirm your email address before publishing. Drafts are unaffected."
export const ERR_QUOTA_EXCEEDED = (topics: string[]) =>
  `Topic quota reached for: ${topics.join(", ")}. You may publish at most 2 entries per topic.`
export const ERR_NOT_PUBLISHABLE = "This entry is not ready to publish."
export const ERR_MAIL_FAILED = "We could not send the email. Please try again."
export const ERR_ALREADY_VERIFIED = "This email address is already verified."
export const ERR_INVALID_TOKEN = "That verification link is invalid or has expired."
export const ERR_SERVER = "Something went wrong. Please try again."
