import { Router } from "express"
import UserRouter from "./v1/user/index.js"
import ModerationRouter from "./v1/moderation/index.js"

const AppRouter = Router()

AppRouter.use("/v1/user", UserRouter)
AppRouter.use("/v1/moderation", ModerationRouter)

export default AppRouter
