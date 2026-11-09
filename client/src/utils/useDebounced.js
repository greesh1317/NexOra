import { useEffect, useState } from "react";

// Returns `value` only after it has stopped changing for `ms` — so a search box
// asks the server once you pause typing, not on every keystroke.
export function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
