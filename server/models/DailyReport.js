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

// Indexes for the lookups the app does most often
dailyReportSchema.index({ user: 1, date: -1 });
dailyReportSchema.index({ project: 1, date: -1 });

export default mongoose.model("DailyReport", dailyReportSchema);
