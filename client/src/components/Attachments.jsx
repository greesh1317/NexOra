import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client.js";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ACCEPT = ".pdf,.png,.jpg,.jpeg,.gif,.txt,.md,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip";

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Upload one file and attach it to a task ({ task: id }) or a daily report ({ report: id })
export async function uploadFile(token, target, file) {
  if (file.size > MAX_FILE_BYTES) throw new Error("File is too large (max 5 MB)");
  const fd = new FormData();
  Object.entries(target).forEach(([k, v]) => fd.append(k, v));
  fd.append("file", file);
  return api.upload("/attachments", fd, token);
}

// Loads every attachment the current user may see, grouped by task id and report id
export function useAttachments(token) {
  const [items, setItems] = useState([]);

  const reload = useCallback(async () => {
    try {
      setItems(await api.get("/attachments", token));
    } catch {
      // Attachments are an extra — never let a failure here break the dashboard
    }
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  const { byTask, byReport } = useMemo(() => {
    const t = {};
    const r = {};
    for (const a of items) {
      if (a.task) (t[a.task] = t[a.task] || []).push(a);
      if (a.report) (r[a.report] = r[a.report] || []).push(a);
    }
    return { byTask: t, byReport: r };
  }, [items]);

  return { items, byTask, byReport, reload };
}

// The list of files on one task / report: click to download, × to delete (uploader or Manager)
export function AttachmentChips({ files = [], token, currentUser, onChanged, onError }) {
  if (files.length === 0) return null;

  const handleDownload = async (f) => {
    try {
      await api.download(`/attachments/${f._id}/download`, token, f.filename);
    } catch (err) {
      onError?.(err.message);
    }
  };

  const handleDelete = async (f) => {
    if (!window.confirm(`Delete "${f.filename}"?`)) return;
    try {
      await api.del(`/attachments/${f._id}`, token);
      onChanged?.();
    } catch (err) {
      onError?.(err.message);
    }
  };

  return (
    <ul className="space-y-1">
      {files.map((f) => {
        const mine = f.uploadedBy?._id === currentUser?._id;
        const canDelete = mine || currentUser?.role === "manager";
        return (
          <li key={f._id} className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => handleDownload(f)}
              title={`Download ${f.filename}${f.uploadedBy?.name ? ` — uploaded by ${f.uploadedBy.name}` : ""}`}
              className="flex items-center gap-1 max-w-[190px] bg-slate-100 hover:bg-slate-200 rounded-md px-2 py-1 text-slate-700 transition-colors"
            >
              <span aria-hidden>📎</span>
              <span className="truncate">{f.filename}</span>
              <span className="text-slate-400 shrink-0">{formatSize(f.size)}</span>
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(f)}
                aria-label={`Delete ${f.filename}`}
                className="text-slate-300 hover:text-red-500 px-1"
              >
                ×
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// "＋ Attach file" button for one task or report
export function AttachButton({ token, target, onUploaded, onError, label = "＋ Attach file" }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    setBusy(true);
    try {
      await uploadFile(token, target, file);
      onUploaded?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={handleChange} />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-60 font-medium"
      >
        {busy ? "Uploading..." : label}
      </button>
    </>
  );
}
