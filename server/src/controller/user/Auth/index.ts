import type { Request, Response } from "express"
import { z } from "zod"
import { AuthUsecase, loginSchema, registerSchema, updateProfileSchema } from "../../../usecase/user/Auth/index.js"
import { sendResponse } from "../../../utils/express.js"
import { ApiError } from "../../../middleware/error.js"
import { mailConfigured, sendMail, verificationMail, passwordResetMail } from "../../../service/mail.js"
import { env } from "../../../config/index.js"

const verifyConfirmSchema = z.object({ token: z.string().min(16).max(200) })

export const AuthController = {
  async Register(req: Request, res: Response) {
    const input = registerSchema.parse(req.body)
    const data  = await AuthUsecase.Register(input)
    sendResponse(res, 201, true, data, "Account created successfully.")
  },

  async Login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body)
    const data  = await AuthUsecase.Login(input)
    sendResponse(res, 200, true, data, "Logged in successfully.")
  },

  async Logout(req: Request, res: Response) {
    await AuthUsecase.Logout(req.user!.id)
    sendResponse(res, 200, true, null, "Logged out.")
  },

  async Me(req: Request, res: Response) {
    const user = await AuthUsecase.Me(req.user!.id)
    sendResponse(res, 200, true, { user }, "")
  },

  async UpdateMe(req: Request, res: Response) {
    const input = updateProfileSchema.parse(req.body)
    const user  = await AuthUsecase.UpdateProfile(req.user!.id, input)
    sendResponse(res, 200, true, { user }, "Profile updated.")
  },

  async RequestVerify(req: Request, res: Response) {
    if (env.NODE_ENV === "production" && !mailConfigured()) {
      throw new ApiError(503, "not_configured", "Email verification needs a mail transport.")
    }

    const result = await AuthUsecase.RequestEmailVerification(req.user!.id)
    if (result.alreadyVerified) return sendResponse(res, 200, true, { alreadyVerified: true }, "")

    if (!mailConfigured()) {
      return sendResponse(res, 200, true, { alreadyVerified: false, token: result.token, deliveredBy: "response" }, "")
    }

    const user    = await AuthUsecase.GetUserById(req.user!.id)
    const sent    = await sendMail(verificationMail(user.email as string, user.name as string, result.token!))
    if (!sent.sent) {
      throw new ApiError(502, "mail_failed", `We could not send the email. ${sent.reason}`)
    }
    sendResponse(res, 200, true, { alreadyVerified: false, deliveredBy: sent.transport }, "")
  },

  async ConfirmVerify(req: Request, res: Response) {
    const { token } = verifyConfirmSchema.parse(req.body)
    const data = await AuthUsecase.ConfirmEmailVerification(token)
    sendResponse(res, 200, true, data, "Email verified.")
  },

  async ForgotPassword(req: Request, res: Response) {
    const { email } = z.object({ email: z.string().trim().toLowerCase().email() }).parse(req.body)
    const result = await AuthUsecase.RequestPasswordReset(email)

    if (!result.user) {
      return sendResponse(res, 200, true, { deliveredBy: "none" }, "If that email is in our system, a reset link is on its way.")
    }
    if (!mailConfigured()) {
      return sendResponse(res, 200, true, { deliveredBy: "response", token: result.token }, "")
    }
    const sent = await sendMail(passwordResetMail(result.user.email as string, result.user.name as string, result.token!))
    if (!sent.sent) throw new ApiError(502, "mail_failed", `We could not send the email. ${sent.reason}`)
    sendResponse(res, 200, true, { deliveredBy: sent.transport }, "If that email is in our system, a reset link is on its way.")
  },

  async ResetPassword(req: Request, res: Response) {
    const { token, password } = z.object({
      token:    z.string().min(16).max(200),
      password: z.string().min(10).max(200),
    }).parse(req.body)
    const data = await AuthUsecase.ConfirmPasswordReset(token, password)
    sendResponse(res, 200, true, data, "Password reset successfully.")
  },
}
