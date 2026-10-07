import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

// Simple Prev/Next + "showing X-Y of Z" pager, reused across every admin
// list page instead of each one rolling its own.
export default function Pagination({ page, limit, total, onPageChange }) {
  if (!total) return null;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-800">
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">Showing {from}–{to} of {total}</p>
      <div className="flex items-center gap-2">
        <button disabled={page === 1} onClick={() => onPageChange(page - 1)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <FiChevronLeft className="w-4 h-4" /> Prev
        </button>
        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 px-1">Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
        <button disabled={page * limit >= total} onClick={() => onPageChange(page + 1)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Next <FiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
