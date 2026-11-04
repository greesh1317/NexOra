import { isSafeLink } from "../utils/github.js";

// Renders a submitted proof-of-work link as a safe, clickable anchor.
// Non-http(s) values are shown as plain text so a pasted "javascript:" URL can never be clicked.
function ProofLink({ url }) {
  if (!url) return <span className="text-slate-300">—</span>;

  if (!isSafeLink(url)) {
    return <span className="text-slate-500 text-xs break-all">{url}</span>;
  }

  let label = url;
  try {
    label = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // keep raw url as label
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
    >
      {label} ↗
    </a>
  );
}

export default ProofLink;
