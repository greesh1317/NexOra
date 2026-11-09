import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed"],
      default: "upcoming",
    },
    startDate: { type: Date },
    endDate: { type: Date },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Indexes for the lookups the app does most often
projectSchema.index({ leader: 1 });
projectSchema.index({ team: 1 });

export default mongoose.model("Project", projectSchema);
