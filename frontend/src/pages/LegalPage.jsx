import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiShield, FiFileText, FiMail, FiPhone, FiClock, FiChevronRight } from 'react-icons/fi';
import { settingsAPI } from '../services/api';
import LegalContent, { LEGAL_PAGES, fillPlaceholders, parseLegal } from '../components/common/LegalContent';

// Public Privacy Policy / Terms & Conditions page — content managed by Admin /
// Super Admin from Settings → Legal Pages.
export default function LegalPage({ seller = null, basePath = '' }) {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\/+|\/+$/g, '').split('/').pop();
  const [page, setPage] = useState(null);
  const [settings, setSettings] = useState({});
  const [error, setError] = useState(false);

  useEffect(() => {
    setPage(null); setError(false);
    window.scrollTo(0, 0);
    settingsAPI.getLegalPage(slug).then(d => {
      const sellerContent = slug === 'privacy-policy' ? seller?.legalPages?.privacyPolicy : seller?.legalPages?.termsAndConditions;
      setPage(seller ? { ...d.page, content: sellerContent || d.page?.content, title: slug === 'privacy-policy' ? 'Privacy Policy' : 'Terms & Conditions' } : d.page);
    }).catch(() => setError(true));
  }, [slug]);
  useEffect(() => {
    if (seller) {
      setSettings({ siteName: seller.shopName, contactEmail: seller.footerEmail, contactPhone: seller.phone, address: seller.address });
      return;
    }
    settingsAPI.getPublic().then(d => setSettings(d.settings || {})).catch(() => {});
  }, [seller]);

  const blocks = useMemo(() => parseLegal(fillPlaceholders(page?.content, settings)), [page, settings]);
  const toc = blocks.filter(b => b.type === 'h');
  const other = LEGAL_PAGES.find(p => p.slug !== slug);
  const Icon = slug === 'privacy-policy' ? FiShield : FiFileText;

  useEffect(() => { if (page?.title) document.title = `${page.title} | ${settings.siteName || 'growthkarts'}`; }, [page, settings]);

  if (error) {
    return <div className="max-w-3xl mx-auto px-4 py-24 text-center text-gray-500 dark:text-gray-400">This page could not be loaded. Please try again later.</div>;
  }

  return (
    <div className="bg-slate-50 dark:bg-[#05070f] min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
          <nav className="flex items-center gap-1.5 text-xs text-white/70 mb-5">
            <Link to={basePath || '/'} className="hover:text-white">Home</Link><FiChevronRight className="w-3 h-3" /><span className="text-white">{page?.title || '…'}</span>
          </nav>
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/15 backdrop-blur items-center justify-center shrink-0"><Icon className="w-7 h-7" /></div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{page?.title || <span className="inline-block h-9 w-64 rounded-lg bg-white/20 animate-pulse" />}</h1>
              {page?.summary && <p className="mt-2 text-white/85 max-w-2xl">{page.summary}</p>}
              {page?.updatedAt && (
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                  <FiClock className="w-3.5 h-3.5" /> Last updated {new Date(page.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 grid lg:grid-cols-[240px_1fr] gap-8">
        {/* Table of contents */}
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-4">
            {toc.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">On this page</p>
                <ul className="space-y-1.5">
                  {toc.map(h => (
                    <li key={h.id}><a href={`#${h.id}`} className="block text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 leading-snug">{h.text}</a></li>
                  ))}
                </ul>
              </div>
            )}
            {other && (
              <Link to={`${basePath || ''}/${other.slug}`} className="flex items-center justify-between rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 p-4 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:border-blue-300">
                {other.label} <FiChevronRight className="w-4 h-4 text-blue-500" />
              </Link>
            )}
          </div>
        </aside>

        <div className="min-w-0">
          <article className="rounded-3xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-sm p-6 sm:p-10">
            {page ? <LegalContent blocks={blocks} /> : (
              <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-4 rounded bg-gray-100 dark:bg-white/10 animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />)}</div>
            )}
          </article>

          
          {other && <Link to={`${basePath || ''}/${other.slug}`} className="lg:hidden mt-4 flex items-center justify-between rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 p-4 text-sm font-semibold text-gray-800 dark:text-gray-100">{other.label} <FiChevronRight className="w-4 h-4 text-blue-500" /></Link>}
        </div>
      </div>
    </div>
  );
}
