import mongoose from "mongoose"
import { env } from "../config/index.js"
import { logger } from "../libraries/logger.js"

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB })
    logger.info({ db: env.MONGODB_DB }, "mongodb connected")
  } catch (error) {
    logger.fatal({ err: error }, "mongodb connection failed")
    process.exit(1)
  }
}

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect()
  logger.info("mongodb disconnected")
}
