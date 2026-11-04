import express from "express";
import {
  getAttachments,
  createAttachment,
  downloadAttachment,
  deleteAttachment,
  handleUpload,
} from "../controllers/attachmentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getAttachments).post(protect, handleUpload, createAttachment);
router.get("/:id/download", protect, downloadAttachment);
router.delete("/:id", protect, deleteAttachment);

export default router;
