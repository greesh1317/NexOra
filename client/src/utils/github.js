// Builds a GitHub "commits by me, for one day" URL, e.g.
// https://github.com/owner/repo/commits?author=user&since=2026-09-20&until=2026-09-21
// This is what a team member pastes into a daily report as proof of work.

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function buildCommitsLink({ repo, username, date = new Date() }) {
  const cleanRepo = (repo || "").trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "");
  const cleanUser = (username || "").trim();
  if (!cleanRepo || !cleanUser) return "";

  const since = formatDate(date);
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const until = formatDate(next);

  return `https://github.com/${cleanRepo}/commits?author=${encodeURIComponent(cleanUser)}&since=${since}&until=${until}`;
}

// Only allow http(s) links to be rendered as clickable anchors
export function isSafeLink(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim());
}
