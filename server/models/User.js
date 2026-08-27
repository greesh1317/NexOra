import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["manager", "team_leader", "team_member"],
      default: "team_member",
    },
    department: { type: String },
    skills: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
