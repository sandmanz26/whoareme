import { Router } from "express"
import { asyncErrorHandler } from "../../../middleware/index.js"
import { isAuth } from "../../../middleware/userAuth.js"
import { funnelLimiter } from "../../../middleware/rateLimit.js"

import { AnalyticsController } from "../../../controller/moderation/Analytics/index.js"
import { ModerationReportsController } from "../../../controller/moderation/Reports/index.js"
import { ModerationWorkController } from "../../../controller/moderation/Work/index.js"
import { ModerationPeopleController } from "../../../controller/moderation/People/index.js"
import { ModerationNoticesController } from "../../../controller/moderation/Notices/index.js"
import { ModerationSettingsController } from "../../../controller/moderation/Settings/index.js"

const ModerationRouter = Router()

// ── Analytics (funnel ingest is public; read is moderator-gated) ─────────────
ModerationRouter.post(
  "/analytics/funnel",
  funnelLimiter,
  asyncErrorHandler(AnalyticsController.RecordFunnel),
)
ModerationRouter.get(
  "/analytics/funnel",
  isAuth("moderator"),
  asyncErrorHandler(AnalyticsController.GetFunnel),
)

// ── Moderator-only below ─────────────────────────────────────────────────────
ModerationRouter.get(
  "/reports",
  isAuth("moderator"),
  asyncErrorHandler(ModerationReportsController.GetList),
)
ModerationRouter.post(
  "/reports/:id/resolve",
  isAuth("moderator"),
  asyncErrorHandler(ModerationReportsController.Resolve),
)

ModerationRouter.post(
  "/work/:id/unpublish",
  isAuth("moderator"),
  asyncErrorHandler(ModerationWorkController.Unpublish),
)
ModerationRouter.post(
  "/work/:id/republish",
  isAuth("moderator"),
  asyncErrorHandler(ModerationWorkController.Republish),
)

ModerationRouter.post(
  "/people/:id/suspend",
  isAuth("moderator"),
  asyncErrorHandler(ModerationPeopleController.Suspend),
)
ModerationRouter.post(
  "/people/:id/reinstate",
  isAuth("moderator"),
  asyncErrorHandler(ModerationPeopleController.Reinstate),
)
ModerationRouter.get(
  "/log",
  isAuth("moderator"),
  asyncErrorHandler(ModerationPeopleController.GetAuditLog),
)

ModerationRouter.get(
  "/appeals",
  isAuth("moderator"),
  asyncErrorHandler(ModerationNoticesController.GetOpenAppeals),
)
ModerationRouter.post(
  "/appeals/:id/decide",
  isAuth("moderator"),
  asyncErrorHandler(ModerationNoticesController.DecideAppeal),
)

ModerationRouter.get(
  "/settings",
  isAuth("moderator"),
  asyncErrorHandler(ModerationSettingsController.Get),
)
ModerationRouter.put(
  "/settings",
  isAuth("moderator"),
  asyncErrorHandler(ModerationSettingsController.Update),
)

export default ModerationRouter
