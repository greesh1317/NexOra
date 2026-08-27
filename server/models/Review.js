import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    rating: { type: Number, min: 1, max: 5 },
    comments: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Review", reviewSchema);
