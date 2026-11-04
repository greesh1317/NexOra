import mongoose from "mongoose";

const dailyReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    date: { type: Date, default: Date.now },
    workDone: { type: String },
    blockers: { type: String },
    hours: { type: Number },
    // e.g. a GitHub commits-filter link scoped to that day — proof of what was done
    submissionLink: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("DailyReport", dailyReportSchema);
