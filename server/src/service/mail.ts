import { env } from "../config/index.js"

export function mailConfigured(): boolean {
  return env.MAIL_TRANSPORT !== "none"
}

interface MailPayload {
  to: string
  subject: string
  text: string
  html: string
}

type MailResult =
  | { sent: true; transport: string }
  | { sent: false; reason: string }

export async function sendMail(payload: MailPayload): Promise<MailResult> {
  if (env.MAIL_TRANSPORT === "log") {
    console.log("[mail]", payload)
    return { sent: true, transport: "log" }
  }

  if (env.MAIL_TRANSPORT === "http") {
    const res = await fetch(env.MAIL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.MAIL_API_KEY}`,
      },
      body: JSON.stringify({ from: env.MAIL_FROM, ...payload }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return { sent: false, reason: `${res.status} ${body}` }
    }

    return { sent: true, transport: "http" }
  }

  return { sent: false, reason: "No mail transport configured." }
}

export function verificationMail(to: string, name: string, token: string): MailPayload {
  const link = `${env.APP_BASE_URL}/verify?token=${token}`
  return {
    to,
    subject: "Verify your email — whoareyou",
    text: `Hi ${name},\n\nVerify your email: ${link}\n\nThis link expires in 24 hours.`,
    html: `<p>Hi ${name},</p><p><a href="${link}">Verify your email</a></p><p>This link expires in 24 hours.</p>`,
  }
}
