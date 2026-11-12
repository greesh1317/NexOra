// Builds CSV text that opens correctly in Excel.

// One cell. Quotes values that contain commas, quotes or line breaks.
// Spreadsheet "formula injection" guard: text that starts with = + - @ would be run as a formula when the
// file is opened (a report written by a team member could try this), so such text gets a leading ' which
// makes Excel show it as plain text. Real numbers are left alone.
export function csvCell(value) {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

// rows = array of arrays. The leading BOM makes Excel read accents and non-English names correctly.
export const toCsv = (rows) => "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
