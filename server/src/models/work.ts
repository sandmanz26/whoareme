import { model, Schema } from "mongoose"
import type { IWork } from "../interface/IWork.js"
import { auditFields } from "../utils/model.js"

const AuthorSnapshotSchema = new Schema(
  {
    slug:      { type: String, required: true },
    name:      { type: String, required: true },
    title:     { type: String, default: "" },
    company:   { type: String, default: "" },
    photoUrl:  { type: String, default: "" },
    years:     { type: Number, default: 0 },
    languages: { type: [String], default: [] },
  },
  { _id: false },
)

const WorkDetailSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
    proof: { type: Boolean, default: false },
  },
  { _id: false },
)

const WorkSectionSchema = new Schema(
  {
    heading: { type: String, required: true },
    body:    { type: String, required: true },
  },
  { _id: false },
)

const WorkLinkSchema = new Schema(
  {
    label: { type: String, required: true },
    href:  { type: String, required: true },
  },
  { _id: false },
)

const WorkSchema = new Schema<IWork>(
  {
    slug:     { type: String, required: true, unique: true, trim: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    author:   { type: AuthorSnapshotSchema, required: true },

    authorSuspended: { type: Boolean, default: false },

    mode:     { type: String, required: true },
    template: { type: String, default: null },
    role:     { type: String, required: true },
    topics: { type: [String], default: [] },
    model:  { type: String, default: null },
    skills: { type: [String], default: [] },

    title:    { type: String, required: true, trim: true },
    summary:  { type: String, default: "" },
    year:     { type: Number, required: true },
    duration: { type: String, default: "" },
    scope:    { type: String, default: "" },

    problem:  { type: String, default: "" },
    approach: { type: String, default: "" },
    outcome:  { type: String, default: "" },

    sections: { type: [WorkSectionSchema], default: [] },
    details:  { type: [WorkDetailSchema],  default: [] },
    links:    { type: [WorkLinkSchema],    default: [] },
    stack:    { type: [String], default: [] },

    thumbnailPath: { type: String, default: null },

    status:      { type: String, default: "draft" },
    publishedAt: { type: Date,   default: null },

    metrics: {
      opens: { type: Number, default: 0 },
    },

    searchBlob: { type: String, default: "" },

    ...auditFields,
  },
  { timestamps: false },
)

WorkSchema.index({ authorId: 1, status: 1 })
WorkSchema.index({ topics: 1, status: 1 })
WorkSchema.index({ role: 1, status: 1 })
WorkSchema.index({ authorSuspended: 1, status: 1 })
WorkSchema.index({ searchBlob: "text" })

const Work = model<IWork>("Work", WorkSchema)
export default Work
