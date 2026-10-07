import { useEffect, useMemo, useState } from 'react';

// Splits an already-loaded list into pages for tables whose API returns
// everything at once. Goes back to page 1 whenever the list itself changes
// (new filter / search / reload), and never points past the last page.
// Use with <Pagination page={page} limit={limit} total={total} onPageChange={setPage} />.
export function usePagedList(items, limit = 20) {
  const list = Array.isArray(items) ? items : [];
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [items]);

  const lastPage = Math.max(1, Math.ceil(list.length / limit));
  const current = Math.min(page, lastPage);
  const pageItems = useMemo(() => list.slice((current - 1) * limit, current * limit), [list, current, limit]);

  return { pageItems, page: current, setPage, limit, total: list.length };
}
