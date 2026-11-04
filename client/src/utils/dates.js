// Deadlines are whole days: the date picker sends "2026-10-15" and the server stores it at UTC midnight.
// So we read the *UTC* date back — otherwise people west of UTC would see the day before.
export const dateKey = (value) => new Date(value).toISOString().slice(0, 10);

const pad = (n) => String(n).padStart(2, "0");

// "YYYY-MM-DD" for a local Date
export const localKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Today's date in the user's own time zone
export const todayKey = () => localKey(new Date());

// "YYYY-MM-DD" -> local midnight Date
export const keyToDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Whole days from one key to another (negative = in the past)
export const daysBetweenKeys = (fromKey, toKey) =>
  Math.round((keyToDate(toKey) - keyToDate(fromKey)) / 86400000);

// "15 Oct 2026" — or an em dash when there is no date
export const formatDeadline = (value) =>
  value
    ? keyToDate(dateKey(value)).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "—";
