import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    assignedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deadline: { type: Date },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "blocked"],
      default: "not_started",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    // Proof-of-work link the assignee pastes in — e.g. a GitHub commit/PR URL,
    // a deployed preview, a doc. Optional; purely for a reviewer to click.
    submissionLink: { type: String },
    // When the task was marked completed (set automatically; cleared if it is reopened). Feeds the weekly trend.
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for the lookups the app does most often
taskSchema.index({ project: 1, createdAt: -1 });
taskSchema.index({ assignedUser: 1 });

export default mongoose.model("Task", taskSchema);
