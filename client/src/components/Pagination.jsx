// "Showing 21–40 of 87" with Previous / Next. Used under server-paged tables.
function Pagination({ page, pages, total, limit, onPage }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const button =
    "text-sm border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-3">
        <button className={button} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button className={button} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

export default Pagination;
