import { useState, useEffect, useRef } from 'react';
import { FiGlobe, FiChevronDown } from 'react-icons/fi';
import { getCurrentLangCode, setLanguageCookie } from '../../utils/googleTranslate';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'ur', label: 'Urdu' },
];

// Script loading + banner suppression now run globally from App.jsx (see
// utils/googleTranslate.js) so they're active on every route, not just
// pages where this dropdown happens to be mounted. This component is just
// the UI + the cookie read/write to drive the switch.
export default function LanguageSwitcher({ dark = false }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(getCurrentLangCode);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const changeLanguage = (code) => {
    if (code === current) { setOpen(false); return; }
    setLanguageCookie(code);
    window.location.reload();
  };

  const currentLabel = LANGUAGES.find(l => l.code === current)?.label || 'English';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        title="Change language"
        className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
          dark ? 'text-white/85 hover:bg-white/10' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <FiGlobe className="w-4 h-4" />
        <span className="hidden lg:inline">{currentLabel}</span>
        <FiChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 py-2 w-40 z-50 max-h-72 overflow-y-auto">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => changeLanguage(l.code)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                l.code === current
                  ? 'text-blue-600 font-semibold bg-blue-50 dark:bg-blue-500/10'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-gray-800'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
