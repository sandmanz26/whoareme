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

type MailResult = { sent: true; transport: string } | { sent: false; reason: string }

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

// ── Shared layout ────────────────────────────────────────────────────────────

function emailLayout(content: string, previewText: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>whoareyou</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f5f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <!-- Preview text (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f4ef;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;">
              <a href="${env.APP_BASE_URL}" style="text-decoration:none;">
                <span style="font-size:15px;font-weight:700;color:#0b0b0f;letter-spacing:-0.02em;">whoareyou</span>
              </a>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;padding:40px 40px 36px;border:1px solid #e2e0d7;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#6b6b76;line-height:1.6;">
                You received this email because an account at
                <a href="${env.APP_BASE_URL}" style="color:#6b6b76;text-decoration:underline;">whoareyou</a>
                is linked to this address.
                <br/>If this wasn't you, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:32px;">
    <tr>
      <td style="background-color:#0b0b0f;border-radius:100px;mso-padding-alt:0;">
        <a href="${href}"
           style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;border-radius:100px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`
}

function fallbackLink(href: string): string {
  return `<p style="margin:20px 0 0;font-size:12px;color:#6b6b76;">
    Button not working?
    <a href="${href}" style="color:#6b6b76;word-break:break-all;">${href}</a>
  </p>`
}

// ── Templates ────────────────────────────────────────────────────────────────

export function verificationMail(to: string, name: string, token: string): MailPayload {
  const link = `${env.APP_BASE_URL}/verify?token=${token}`
  const firstName = name.split(" ")[0]

  const html = emailLayout(
    `<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0b0b0f;letter-spacing:-0.03em;line-height:1.2;">
      Verify your email
    </h1>
    <p style="margin:0 0 6px;font-size:15px;color:#2a2a31;line-height:1.6;">
      Hi ${firstName},
    </p>
    <p style="margin:0;font-size:15px;color:#6b6b76;line-height:1.6;">
      One quick step — confirm this is your email address so you can publish work and be found in the directory.
      This link expires in <strong style="color:#2a2a31;">24 hours</strong>.
    </p>
    ${ctaButton(link, "Verify email address")}
    <hr style="margin:32px 0;border:none;border-top:1px solid #e2e0d7;" />
    <p style="margin:0;font-size:13px;color:#6b6b76;line-height:1.6;">
      Your profile is live, but publishing work is gated behind verification.
      After you verify, everything unlocks.
    </p>
    ${fallbackLink(link)}`,
    `Verify your email to publish work on whoareyou.`,
  )

  const text = `Hi ${firstName},

Verify your email address to publish work on whoareyou.

${link}

This link expires in 24 hours. If you didn't create an account, ignore this email.`

  return { to, subject: "Verify your email — whoareyou", text, html }
}

export function passwordResetMail(to: string, name: string, token: string): MailPayload {
  const link = `${env.APP_BASE_URL}/reset?token=${token}`
  const firstName = name.split(" ")[0]

  const html = emailLayout(
    `<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0b0b0f;letter-spacing:-0.03em;line-height:1.2;">
      Reset your password
    </h1>
    <p style="margin:0 0 6px;font-size:15px;color:#2a2a31;line-height:1.6;">
      Hi ${firstName},
    </p>
    <p style="margin:0;font-size:15px;color:#6b6b76;line-height:1.6;">
      We received a request to reset the password for your whoareyou account.
      Click the button below to choose a new one.
      This link expires in <strong style="color:#2a2a31;">1 hour</strong>.
    </p>
    ${ctaButton(link, "Reset password")}
    <hr style="margin:32px 0;border:none;border-top:1px solid #e2e0d7;" />
    <p style="margin:0;font-size:13px;color:#6b6b76;line-height:1.6;">
      If you didn't request a password reset, no action is needed — your account is safe
      and your password has not been changed.
    </p>
    ${fallbackLink(link)}`,
    `Reset your whoareyou password. This link expires in 1 hour.`,
  )

  const text = `Hi ${firstName},

We received a request to reset your whoareyou password.

${link}

This link expires in 1 hour. If you didn't request this, ignore this email — your account is safe.`

  return { to, subject: "Reset your password — whoareyou", text, html }
}
