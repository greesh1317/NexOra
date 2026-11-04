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
  },
  { timestamps: true }
);

export default mongoose.model("Task", taskSchema);
