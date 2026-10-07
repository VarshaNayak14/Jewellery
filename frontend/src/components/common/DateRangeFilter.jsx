// Small "from / to" date filter reused across admin list pages.
export default function DateRangeFilter({ from, to, onFromChange, onToChange, onClear }) {
  return (
    <div className="flex items-center gap-2">
      <input type="date" value={from} onChange={e => onFromChange(e.target.value)}
        className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300" />
      <span className="text-gray-400 text-xs">to</span>
      <input type="date" value={to} onChange={e => onToChange(e.target.value)}
        className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300" />
      {(from || to) && (
        <button onClick={onClear} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Clear</button>
      )}
    </div>
  );
}
