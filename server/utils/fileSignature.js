// Checks that a file's real contents match its extension, so a renamed program (virus.exe -> photo.png)
// is rejected. Browsers' "Content-Type" and the file name are both chosen by the uploader, so we look
// at the first bytes ("magic numbers") instead. No external package needed for this small allow-list.

const starts = (buf, bytes) => buf.length >= bytes.length && bytes.every((b, i) => buf[i] === b);

const ascii = (text) => [...text].map((c) => c.charCodeAt(0));

const PDF = ascii("%PDF");
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const GIF87 = ascii("GIF87a");
const GIF89 = ascii("GIF89a");
const ZIP = [0x50, 0x4b, 0x03, 0x04]; // .zip and the modern Office files (.docx .xlsx .pptx) are zip containers
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // legacy Office files (.doc .xls .ppt)

// Plain text has no signature, so: no NUL bytes and no stray control characters in the first 8 KB.
// (UTF-16 text starts with a byte-order mark and legitimately contains NULs.)
function looksLikeText(buf) {
  if (starts(buf, [0xff, 0xfe]) || starts(buf, [0xfe, 0xff])) return true;
  const sample = buf.subarray(0, 8192);
  for (const byte of sample) {
    if (byte === 0) return false;
    const isControl = byte < 0x20 && ![0x09, 0x0a, 0x0c, 0x0d, 0x1b].includes(byte);
    if (isControl) return false;
  }
  return true;
}

const CHECKS = {
  ".pdf": (b) => starts(b, PDF),
  ".png": (b) => starts(b, PNG),
  ".jpg": (b) => starts(b, JPEG),
  ".jpeg": (b) => starts(b, JPEG),
  ".gif": (b) => starts(b, GIF87) || starts(b, GIF89),
  ".zip": (b) => starts(b, ZIP),
  ".docx": (b) => starts(b, ZIP),
  ".xlsx": (b) => starts(b, ZIP),
  ".pptx": (b) => starts(b, ZIP),
  ".doc": (b) => starts(b, OLE),
  ".xls": (b) => starts(b, OLE),
  ".ppt": (b) => starts(b, OLE),
  ".txt": looksLikeText,
  ".md": looksLikeText,
  ".csv": looksLikeText,
};

// The content type we store (instead of trusting what the uploader's browser claimed)
const MIME = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".zip": "application/zip",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".doc": "application/msword",
  ".xls": "application/vnd.ms-excel",
  ".ppt": "application/vnd.ms-powerpoint",
  ".txt": "text/plain",
  ".md": "text/plain",
  ".csv": "text/csv",
};

export const contentMatchesExtension = (ext, buffer) => {
  const check = CHECKS[ext];
  return Boolean(check) && buffer.length > 0 && check(buffer);
};

export const mimeForExtension = (ext) => MIME[ext] || "application/octet-stream";
