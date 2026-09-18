import { env } from "../config/env.js"
import { logger } from "./logger.js"

/**
 * Outbound mail.
 *
 * Three transports, chosen by `MAIL_TRANSPORT`:
 *
 * - `none`   — nothing is sent. Every caller is told so, and the one route
 *              that depends on mail hands the token back in its response and
 *              says how it was delivered. Development only; production refuses
 *              to start in this state.
 * - `log`    — the message is written to the log instead of being sent. For a
 *              staging box where a real mailbox would be noise.
 * - `http`   — a JSON POST to `MAIL_API_URL` with a bearer key. The body is
 *              `{from, to, subject, text, html}`, which is Resend's shape and
 *              close enough to most transactional providers to point at one
 *              with an env var rather than a code change.
 *
 * Deliberately not SMTP and deliberately not a library. An HTTP API needs
 * nothing but `fetch`, keeps the dependency list short, and fails with a
 * status code instead of a socket timeout.
 *
 * Sending never throws at the caller. A verification mail that fails to send
 * must not turn into a 500 on a signup: the caller is told `sent: false` and
 * decides, which in practice means "offer the link again" rather than "lose
 * the account".
 */

export interface Mail {
  to: string
  subject: string
  text: string
  html?: string
}

export type MailResult =
  | { sent: true; transport: "log" | "http" }
  | { sent: false; transport: "none" | "log" | "http"; reason: string }

export function mailConfigured(): boolean {
  return env.MAIL_TRANSPORT !== "none"
}

export async function sendMail(mail: Mail): Promise<MailResult> {
  if (env.MAIL_TRANSPORT === "none") {
    return { sent: false, transport: "none", reason: "No mail transport is configured." }
  }

  if (env.MAIL_TRANSPORT === "log") {
    logger.info({ to: mail.to, subject: mail.subject, body: mail.text }, "mail (log transport)")
    return { sent: true, transport: "log" }
  }

  try {
    const response = await fetch(env.MAIL_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.MAIL_API_KEY}`,
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        ...(mail.html ? { html: mail.html } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      // The body may name the reason; the address never goes in the log line.
      const detail = (await response.text()).slice(0, 300)
      logger.error({ status: response.status, detail }, "mail send failed")
      return { sent: false, transport: "http", reason: `Mail provider returned ${response.status}.` }
    }

    return { sent: true, transport: "http" }
  } catch (error) {
    logger.error({ err: error }, "mail send threw")
    return { sent: false, transport: "http", reason: "Could not reach the mail provider." }
  }
}

/** The one message the API sends today. Plain text, because it is one link. */
export function verificationMail(to: string, name: string, token: string): Mail {
  const link = `${env.APP_BASE_URL}/verify?token=${encodeURIComponent(token)}`
  return {
    to,
    subject: "Confirm your email — whoareyou",
    text: [
      `Hi ${name},`,
      "",
      "Confirm this address to publish your work:",
      link,
      "",
      "The link works once and expires in 24 hours. Drafts keep working either way.",
      "",
      "If you did not create an account, ignore this — nothing happens without the link.",
    ].join("\n"),
  }
}
