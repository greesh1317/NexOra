import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    teamName: { type: String, required: true },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// Indexes for the lookups the app does most often
teamSchema.index({ leader: 1 });
teamSchema.index({ members: 1 });

export default mongoose.model("Team", teamSchema);
