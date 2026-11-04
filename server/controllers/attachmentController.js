import path from "path";
import multer from "multer";
import Attachment from "../models/Attachment.js";
import Task from "../models/Task.js";
import DailyReport from "../models/DailyReport.js";
import { attachmentAccessFilter, leadsProject } from "../utils/access.js";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per file
const MAX_PER_TARGET = 10; // files per task / report
// Documents, images and archives only. No .html/.svg/.js — nothing a browser could run.
const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".txt", ".md", ".csv",
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      const err = new Error(`".${ext.replace(".", "") || "?"}" files are not allowed. Allowed: PDF, images, Office files, txt/md/csv, zip.`);
      err.code = "BAD_TYPE";
      return cb(err);
    }
    cb(null, true);
  },
});

// Runs multer and turns its errors into friendly JSON responses
export const handleUpload = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "File is too large (max 5 MB)" });
    if (err.code === "BAD_TYPE") return res.status(400).json({ message: err.message });
    return res.status(400).json({ message: "Upload failed", error: err.message });
  });
};

const toMeta = (doc) => ({
  _id: doc._id,
  filename: doc.filename,
  mimeType: doc.mimeType,
  size: doc.size,
  uploadedBy: doc.uploadedBy,
  task: doc.task,
  report: doc.report,
  createdAt: doc.createdAt,
});

const nonEmpty = (o) => Object.keys(o).length > 0;
const combine = (...parts) => {
  const real = parts.filter(nonEmpty);
  if (real.length === 0) return {};
  return real.length === 1 ? real[0] : { $and: real };
};

// @desc    List the attachments the caller may see (metadata only, never the file bytes)
// @route   GET /api/attachments?task=<id>&report=<id>
export const getAttachments = async (req, res) => {
  try {
    const access = await attachmentAccessFilter(req.user);
    const extra = {};
    if (req.query.task) extra.task = req.query.task;
    if (req.query.report) extra.report = req.query.report;

    const items = await Attachment.find(combine(access, extra))
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(items.map(toMeta));
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid id" });
    res.status(500).json({ message: "Failed to fetch attachments", error: error.message });
  }
};

// @desc    Upload a file and attach it to one task OR one daily report
// @route   POST /api/attachments   (multipart/form-data: file, task | report)
export const createAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Choose a file to upload" });
    }
    const { task: taskId, report: reportId } = req.body;
    if (Boolean(taskId) === Boolean(reportId)) {
      return res.status(400).json({ message: "Attach the file to either a task or a report" });
    }

    if (taskId) {
      const task = await Task.findById(taskId);
      if (!task) return res.status(404).json({ message: "Task not found" });
      const isAssignee = task.assignedUser?.toString() === req.user._id.toString();
      const canManage =
        req.user.role === "manager" ||
        (req.user.role === "team_leader" && (await leadsProject(req.user._id, task.project)));
      if (!isAssignee && !canManage) {
        return res.status(403).json({ message: "You can only attach files to your own tasks" });
      }
    } else {
      const report = await DailyReport.findById(reportId);
      if (!report) return res.status(404).json({ message: "Report not found" });
      if (report.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "You can only attach files to your own reports" });
      }
    }

    const existing = await Attachment.countDocuments(taskId ? { task: taskId } : { report: reportId });
    if (existing >= MAX_PER_TARGET) {
      return res.status(400).json({ message: `A maximum of ${MAX_PER_TARGET} files can be attached here` });
    }

    // Keep the readable name but strip characters that are unsafe in file names
    const safeName = path.basename(req.file.originalname).replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").slice(-120);

    const doc = await Attachment.create({
      filename: safeName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer,
      uploadedBy: req.user._id,
      task: taskId || undefined,
      report: reportId || undefined,
    });

    res.status(201).json(toMeta(doc));
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid id" });
    res.status(500).json({ message: "Failed to upload file", error: error.message });
  }
};

// @desc    Download a file (only if the caller may see it)
// @route   GET /api/attachments/:id/download
export const downloadAttachment = async (req, res) => {
  try {
    const access = await attachmentAccessFilter(req.user);
    const doc = await Attachment.findOne(combine({ _id: req.params.id }, access)).select("+data");
    if (!doc) return res.status(404).json({ message: "File not found" });

    res.attachment(doc.filename); // forces a download — the browser never renders the file
    res.set("X-Content-Type-Options", "nosniff");
    res.send(doc.data);
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid id" });
    res.status(500).json({ message: "Failed to download file", error: error.message });
  }
};

// @desc    Delete a file (the uploader or a Manager)
// @route   DELETE /api/attachments/:id
export const deleteAttachment = async (req, res) => {
  try {
    const doc = await Attachment.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "File not found" });

    if (req.user.role !== "manager" && doc.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete files you uploaded" });
    }

    await doc.deleteOne();
    res.status(200).json({ message: "File deleted" });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid id" });
    res.status(500).json({ message: "Failed to delete file", error: error.message });
  }
};
