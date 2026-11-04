import mongoose from "mongoose";

// A file a person uploads as proof of work, attached to ONE task or ONE daily report.
// Small files (max 5 MB, enforced in the controller) are stored in MongoDB itself, so the app
// needs no extra storage service and works on hosts with a temporary disk (Render free tier).
const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    mimeType: { type: String },
    size: { type: Number, required: true },
    // select:false -> listing attachments never loads the file bytes; only downloads ask for them
    data: { type: Buffer, required: true, select: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    report: { type: mongoose.Schema.Types.ObjectId, ref: "DailyReport" },
  },
  { timestamps: true }
);

export default mongoose.model("Attachment", attachmentSchema);
