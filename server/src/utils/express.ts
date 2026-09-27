import type { Response } from "express"

export function sendResponse(
  res: Response,
  status: number,
  success: boolean,
  data: unknown,
  message: string,
): void {
  res.status(status).json({ success, data, message })
}
