// Optional paging for list endpoints.
//   - no ?page / ?limit  -> the endpoint answers exactly as before (a plain array)
//   - ?page=2&limit=20   -> { items, total, page, limit, pages }
// So existing screens keep working, and big lists (Overview, People) opt in.

export const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Case-insensitive "contains" regex for search boxes (user input is matched literally)
export const searchRegex = (text) => new RegExp(escapeRegex(String(text).trim()), "i");

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export function getPaging(query) {
  if (query.page === undefined && query.limit === undefined) return null;
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  return { page, limit, skip: (page - 1) * limit };
}

// `shape` adds populate/sort/select to the query. Returns an array, or a page object when paging.
export async function listResult(Model, filter, shape, paging) {
  if (!paging) return shape(Model.find(filter));

  const [items, total] = await Promise.all([
    shape(Model.find(filter)).skip(paging.skip).limit(paging.limit),
    Model.countDocuments(filter),
  ]);
  return {
    items,
    total,
    page: paging.page,
    limit: paging.limit,
    pages: Math.max(1, Math.ceil(total / paging.limit)),
  };
}
