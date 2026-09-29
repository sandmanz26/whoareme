import { model, Schema } from "mongoose"
import type { IUser } from "../interface/IUser.js"
import { auditFields } from "../utils/model.js"

const UserSchema = new Schema<IUser>(
  {
    slug:  { type: String, required: true, unique: true, trim: true },
    name:  { type: String, required: true, trim: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    passwordHash:          { type: String, default: null },
    emailVerifiedAt:       { type: Date,   default: null },
    emailVerifyTokenHash:   { type: String, default: null },
    emailVerifyExpiresAt:   { type: Date,   default: null },
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpiresAt: { type: Date,   default: null },

    role:         { type: String, required: true },
    title:        { type: String, default: "" },
    company:      { type: String, default: "" },
    location:     { type: String, default: "" },
    years:        { type: Number, default: 0 },
    languages:    { type: [String], default: [] },
    topics:       { type: [String], default: [] },
    skills:       { type: [String], default: [] },
    openToWork:   { type: Boolean, default: false },
    photoUrl:     { type: String, default: "" },
    portfolioUrl: { type: String, default: "" },
    pitch:        { type: String, default: "" },

    token:   { type: String, default: null },
    seeded:  { type: Boolean, default: false },
    status:  { type: String, default: "active" },
    access:  { type: String, default: "member" },

    counts: {
      publishedWorks: { type: Number, default: 0 },
      topicUsage:     { type: Map, of: Number, default: {} },
    },

    searchBlob: { type: String, default: "" },

    ...auditFields,
  },
  { timestamps: false },
)

UserSchema.index({ email: 1 }, { sparse: true })
UserSchema.index({ token: 1 }, { sparse: true })
UserSchema.index({ status: 1, role: 1 })
UserSchema.index({ searchBlob: "text" })

const User = model<IUser>("User", UserSchema)
export default User
