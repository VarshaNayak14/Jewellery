import { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

// A dropdown with an "Other" option at the end: choosing it swaps in a text
// box so the person can type their own value (e.g. a category that isn't in
// the list yet). A value that isn't one of the options opens in that box.
// `onChange` gets the plain string value.
//
// It's a custom list rather than a native <select> so it always opens
// downwards and its options look the same everywhere (a native select opens
// up whenever the browser thinks there isn't room below).
export default function SelectWithOther({
  value = '', onChange, options = [], placeholder = '-- Select --', otherLabel = 'Other (type your own)',
  otherPlaceholder = 'Type here', className = '', required = false, disabled = false, name,
}) {
  const inList = options.some(o => o.value === value);
  const [typing, setTyping] = useState(Boolean(value) && !inList);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  // Options can arrive after the value (loaded later) — re-check once they do.
  useEffect(() => {
    if (value && options.some(o => o.value === value)) setTyping(false);
    else if (value) setTyping(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.length]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Keep the highlighted option in view while using the keyboard.
  useEffect(() => {
    if (open && active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  // Every row in the list, "Other" last.
  const rows = [...options, { value: '__other__', label: otherLabel, other: true }];

  const choose = (row) => {
    setOpen(false);
    if (row.other) { setTyping(true); onChange(''); return; }
    onChange(row.value);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open && ['ArrowDown', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
      setActive(Math.max(options.findIndex(o => o.value === value), 0));
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (rows[active]) choose(rows[active]); }
    else if (e.key === 'Tab') setOpen(false);
  };

  if (typing) {
    return (
      <div className="relative">
        <input autoFocus name={name} value={value} onChange={e => onChange(e.target.value)}
          placeholder={otherPlaceholder} required={required} disabled={disabled} maxLength={60}
          className={`${className} pr-28`} />
        <button type="button" onClick={() => { setTyping(false); onChange(''); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
          Choose from list
        </button>
      </div>
    );
  }

  const selected = options.find(o => o.value === value);
  return (
    <div ref={rootRef} className="relative">
      <button type="button" name={name} disabled={disabled} onKeyDown={onKeyDown}
        onClick={() => { setOpen(o => !o); setActive(Math.max(options.findIndex(o => o.value === value), 0)); }}
        aria-haspopup="listbox" aria-expanded={open}
        className={`${className} text-left flex items-center justify-between gap-2 pr-9`}>
        <span className={`truncate ${selected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
      </button>
      <FiChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`} />
      {/* Keeps the browser's "please fill in" check for a required choice */}
      {required && <input tabIndex={-1} aria-hidden="true" required value={value} onChange={() => {}}
        className="absolute inset-x-0 bottom-0 h-px opacity-0 pointer-events-none" />}

      {open && (
        <ul ref={listRef} role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-40 max-h-64 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl py-1">
          {rows.map((row, i) => {
            const isSel = !row.other && row.value === value;
            return (
              <li key={row.value} role="option" aria-selected={isSel}
                onMouseDown={e => e.preventDefault()} onClick={() => choose(row)} onMouseEnter={() => setActive(i)}
                className={`flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer ${
                  i === active ? 'bg-blue-50 dark:bg-blue-500/15' : ''
                } ${row.other ? 'border-t border-gray-100 dark:border-gray-700 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-800 dark:text-gray-100'}`}>
                <span className="truncate">{row.label}</span>
                {isSel && <FiCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
