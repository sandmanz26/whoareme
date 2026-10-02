import { Router } from "express"
import { asyncErrorHandler } from "../../../middleware/index.js"
import { isAuth, isOptionalAuth } from "../../../middleware/userAuth.js"
import { authLimiter, reportLimiter, writeLimiter } from "../../../middleware/rateLimit.js"
import { uploadThumbnail, uploadPhoto } from "../../../config/multer/index.js"

import { TaxonomyController } from "../../../controller/user/Taxonomy/index.js"
import { SettingsController } from "../../../controller/user/Settings/index.js"
import { AuthController } from "../../../controller/user/Auth/index.js"
import { PeopleController } from "../../../controller/user/People/index.js"
import { WorkController } from "../../../controller/user/Work/index.js"
import { TrafficController } from "../../../controller/user/Traffic/index.js"
import { UploadsController } from "../../../controller/user/Uploads/index.js"
import { ReportsController } from "../../../controller/user/Reports/index.js"
import { NoticesController } from "../../../controller/user/Notices/index.js"

const UserRouter = Router()

// ── Taxonomy ─────────────────────────────────────────────────────────────────
UserRouter.get("/taxonomy", asyncErrorHandler(TaxonomyController.Get))

// ── Settings ──────────────────────────────────────────────────────────────────
UserRouter.get("/settings", asyncErrorHandler(SettingsController.Get))

// ── Auth ──────────────────────────────────────────────────────────────────────
UserRouter.post("/auth/register", authLimiter, asyncErrorHandler(AuthController.Register))
UserRouter.post("/auth/login", authLimiter, asyncErrorHandler(AuthController.Login))
UserRouter.post("/auth/logout", isAuth(), asyncErrorHandler(AuthController.Logout))
UserRouter.get("/auth/me", isAuth(), asyncErrorHandler(AuthController.Me))
UserRouter.patch("/auth/me", isAuth(), asyncErrorHandler(AuthController.UpdateMe))
UserRouter.post(
  "/auth/verify/request",
  isAuth(),
  authLimiter,
  asyncErrorHandler(AuthController.RequestVerify),
)
UserRouter.post(
  "/auth/verify/confirm",
  authLimiter,
  asyncErrorHandler(AuthController.ConfirmVerify),
)
UserRouter.post(
  "/auth/forgot-password",
  authLimiter,
  asyncErrorHandler(AuthController.ForgotPassword),
)
UserRouter.post(
  "/auth/reset-password",
  authLimiter,
  asyncErrorHandler(AuthController.ResetPassword),
)

// ── People ────────────────────────────────────────────────────────────────────
UserRouter.get("/people", asyncErrorHandler(PeopleController.GetList))
UserRouter.get("/people/facets", asyncErrorHandler(PeopleController.GetFacets))
UserRouter.get("/people/:slug", isOptionalAuth, asyncErrorHandler(PeopleController.GetBySlug))
UserRouter.get("/people/:slug/work", asyncErrorHandler(WorkController.GetByAuthor))

// ── Work (mine routes must precede /:slug) ────────────────────────────────────
UserRouter.get("/work/mine/list", isAuth(), asyncErrorHandler(WorkController.GetMineList))
UserRouter.get("/work/mine/:id", isAuth(), asyncErrorHandler(WorkController.GetMineById))
UserRouter.post("/work", isAuth(), writeLimiter, asyncErrorHandler(WorkController.Add))
UserRouter.put("/work/:id", isAuth(), writeLimiter, asyncErrorHandler(WorkController.Update))
UserRouter.post(
  "/work/:id/publish",
  isAuth(),
  writeLimiter,
  asyncErrorHandler(WorkController.Publish),
)
UserRouter.post(
  "/work/:id/unpublish",
  isAuth(),
  writeLimiter,
  asyncErrorHandler(WorkController.Unpublish),
)
UserRouter.delete("/work/:id", isAuth(), writeLimiter, asyncErrorHandler(WorkController.Delete))
UserRouter.get("/work", asyncErrorHandler(WorkController.GetList))
UserRouter.get("/work/:slug", isOptionalAuth, asyncErrorHandler(WorkController.GetBySlug))

// ── Traffic ───────────────────────────────────────────────────────────────────
UserRouter.get("/traffic/me", isAuth(), asyncErrorHandler(TrafficController.GetMySummary))

// ── Uploads ───────────────────────────────────────────────────────────────────
UserRouter.post(
  "/uploads/work/:id/thumbnail",
  isAuth(),
  writeLimiter,
  uploadThumbnail.single("file"),
  asyncErrorHandler(UploadsController.AddThumbnail),
)
UserRouter.delete(
  "/uploads/work/:id/thumbnail",
  isAuth(),
  asyncErrorHandler(UploadsController.DeleteThumbnail),
)
UserRouter.post(
  "/uploads/profile/photo",
  isAuth(),
  writeLimiter,
  uploadPhoto.single("file"),
  asyncErrorHandler(UploadsController.AddPhoto),
)
UserRouter.delete(
  "/uploads/profile/photo",
  isAuth(),
  asyncErrorHandler(UploadsController.DeletePhoto),
)

// ── Reports ───────────────────────────────────────────────────────────────────
UserRouter.post("/reports", isAuth(), reportLimiter, asyncErrorHandler(ReportsController.Add))

// ── Notices ───────────────────────────────────────────────────────────────────
UserRouter.get("/notices", isAuth(), asyncErrorHandler(NoticesController.GetList))
UserRouter.post("/notices/:id/read", isAuth(), asyncErrorHandler(NoticesController.MarkRead))
UserRouter.post("/notices/:id/appeal", isAuth(), asyncErrorHandler(NoticesController.Appeal))

export default UserRouter
