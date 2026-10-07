import { useState, useRef, useEffect, useMemo } from 'react';
import { FiChevronDown, FiX, FiPlus } from 'react-icons/fi';

// ─────────────────────────────────────────────────────────────────────────
// Generic type-ahead combobox: text input + filtered dropdown list.
// - `options`: array of strings to search/select from.
// - `allowCustom`: if true, and the typed text doesn't match any option,
//   shows an "Add <value>" row so the user can use a value that isn't in
//   the list yet (used for Tehsil, since no option list can ever be
//   complete for every town in India).
// - Fully controlled: `value` + `onChange(newValue)`.
// ─────────────────────────────────────────────────────────────────────────
export default function SearchableSelect({
  icon: Icon,
  label,
  placeholder = 'Type to search...',
  options = [],
  value,
  onChange,
  allowCustom = false,
  error,
  loading = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const rootRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 50);
  }, [query, options]);

  const exactMatch = options.some((o) => o.toLowerCase() === query.trim().toLowerCase());

  const select = (val) => {
    onChange(val);
    setQuery(val);
    setOpen(false);
  };

  const clear = () => {
    onChange('');
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative">
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />}
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-16 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
            error ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-gray-700'
          }`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button type="button" onClick={clear} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
          <FiChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>
      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1">
          {loading ? (
            <p className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">Loading...</p>
          ) : filtered.length === 0 && !allowCustom ? (
            <p className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">No matches found</p>
          ) : (
            <>
              {filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => select(opt)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-400"
                >
                  {opt}
                </button>
              ))}
              {allowCustom && query.trim() && !exactMatch && (
                <button
                  type="button"
                  onClick={() => select(query.trim())}
                  className="w-full text-left px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-800"
                >
                  <FiPlus className="w-3.5 h-3.5" /> Use "{query.trim()}"
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}