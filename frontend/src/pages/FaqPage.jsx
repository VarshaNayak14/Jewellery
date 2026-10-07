import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FiHelpCircle, FiSearch, FiChevronDown, FiChevronRight, FiMail, FiPhone, FiX } from 'react-icons/fi';
import { settingsAPI } from '../services/api';
import LegalContent, { fillPlaceholders, parseLegal } from '../components/common/LegalContent';

// Public FAQ page — questions managed by Admin / Super Admin from
// Settings → Pages → FAQ.
export default function FaqPage() {
  const [page, setPage] = useState(null);
  const [settings, setSettings] = useState({});
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [open, setOpen] = useState(() => new Set([0]));

  useEffect(() => {
    window.scrollTo(0, 0);
    settingsAPI.getLegalPage('faq').then(d => setPage(d.page)).catch(() => setError(true));
    settingsAPI.getPublic().then(d => setSettings(d.settings || {})).catch(() => {});
  }, []);
  useEffect(() => { if (page?.title) document.title = `${page.title} | ${settings.siteName || 'growthkarts'}`; }, [page, settings]);

  const items = useMemo(() => (page?.items || []).map((it, i) => ({
    ...it,
    idx: i,
    question: fillPlaceholders(it.question, settings),
    answer: fillPlaceholders(it.answer, settings),
  })), [page, settings]);
  const categories = useMemo(() => [...new Set(items.map(i => i.category || 'General'))], [items]);

  const q = query.trim().toLowerCase();
  const filtered = items.filter(i => (!category || i.category === category)
    && (!q || i.question.toLowerCase().includes(q) || i.answer.toLowerCase().includes(q)));
  const grouped = categories
    .map(c => ({ category: c, items: filtered.filter(i => (i.category || 'General') === c) }))
    .filter(g => g.items.length);

  const toggle = (idx) => setOpen(prev => {
    const next = new Set(prev);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    return next;
  });

  if (error) return <div className="max-w-3xl mx-auto px-4 py-24 text-center text-gray-500 dark:text-gray-400">FAQs could not be loaded. Please try again later.</div>;

  return (
    <div className="bg-slate-50 dark:bg-[#05070f] min-h-screen">
      {/* Hero + search */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center">
          <nav className="flex items-center justify-center gap-1.5 text-xs text-white/70 mb-5">
            <Link to="/" className="hover:text-white">Home</Link><FiChevronRight className="w-3 h-3" /><span className="text-white">FAQ</span>
          </nav>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-4"><FiHelpCircle className="w-7 h-7" /></div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{page?.title || 'Frequently Asked Questions'}</h1>
          {page?.summary && <p className="mt-2 text-white/85">{page.summary}</p>}
          <div className="relative mt-7 max-w-xl mx-auto">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your question..."
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-white text-gray-900 placeholder-gray-400 shadow-lg focus:outline-none focus:ring-4 focus:ring-white/30" />
            {query && <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><FiX className="w-5 h-5" /></button>}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Category chips */}
        {categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {['', ...categories].map(c => (
              <button key={c || 'all'} onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${category === c ? 'bg-blue-600 text-white shadow' : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-blue-300'}`}>
                {c || 'All'}
              </button>
            ))}
          </div>
        )}

        {!page ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-white dark:bg-white/5 animate-pulse" />)}</div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No questions match “{query}”. <button onClick={() => { setQuery(''); setCategory(''); }} className="text-blue-600 hover:underline">Show all</button>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(g => (
              <section key={g.category}>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">{g.category}</h2>
                <div className="space-y-3">
                  {g.items.map(it => {
                    const isOpen = open.has(it.idx) || !!q;
                    return (
                      <div key={it.idx} className={`rounded-2xl bg-white dark:bg-white/5 border transition-colors ${isOpen ? 'border-blue-200 dark:border-blue-500/30 shadow-sm' : 'border-gray-100 dark:border-white/10'}`}>
                        <button onClick={() => toggle(it.idx)} aria-expanded={isOpen}
                          className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
                          <span className="font-semibold text-gray-900 dark:text-white">{it.question}</span>
                          <FiChevronDown className={`w-5 h-5 shrink-0 text-blue-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && it.answer && (
                          <div className="px-5 pb-5 -mt-1">
                            <LegalContent blocks={parseLegal(it.answer)} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Still need help */}
        <div className="mt-10 rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-100 dark:border-blue-500/20 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-bold text-gray-900 dark:text-white">Still have a question?</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Our support team is here to help.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${settings.contactEmail || 'hello@growthkarts.com'}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"><FiMail className="w-4 h-4" /> Email us</a>
            {settings.contactPhone && <a href={`tel:${settings.contactPhone}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 text-sm font-semibold"><FiPhone className="w-4 h-4" /> {settings.contactPhone}</a>}
          </div>
        </div>
      </div>
    </div>
  );
}
