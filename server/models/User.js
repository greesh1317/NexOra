import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["manager", "team_leader", "team_member"],
      default: "team_member",
    },
    // false = deactivated: cannot log in or be given tasks, but all their history is kept
    isActive: { type: Boolean, default: true },
    department: { type: String },
    skills: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
