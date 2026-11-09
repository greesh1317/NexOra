import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["deadline", "assignment", "review", "general"],
      default: "general",
    },
    readStatus: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for the lookups the app does most often
notificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
