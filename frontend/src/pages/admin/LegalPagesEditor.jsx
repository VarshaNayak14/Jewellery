import { useState, useEffect, useMemo, useRef } from 'react';
import { FiSave, FiExternalLink, FiRotateCcw, FiBold, FiList, FiType, FiEye, FiEdit3, FiPlus, FiTrash2, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { settingsAPI } from '../../services/api';
import LegalContent, { LEGAL_PAGES, fillPlaceholders, parseLegal } from '../../components/common/LegalContent';

const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300';

// Settings → Pages: edit the footer's Privacy Policy, Terms & Conditions
// (text + live preview) and FAQ (question list). Saved separately from the
// other settings.
const PAGES = [...LEGAL_PAGES, { slug: 'faq', label: 'FAQ' }];
const toForm = (p) => ({ title: p.title, summary: p.summary || '', content: p.content || '', items: (p.items || []).map(({ category, question, answer }) => ({ category, question, answer })), updatedAt: p.updatedAt });
export default function LegalPagesEditor() {
  const [slug, setSlug] = useState(PAGES[0].slug);
  const isFaq = slug === 'faq';
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('edit'); // mobile: edit | preview
  const textRef = useRef(null);

  useEffect(() => { settingsAPI.getPublic().then(d => setSettings(d.settings || {})).catch(() => {}); }, []);
  useEffect(() => {
    setForm(null);
    settingsAPI.getLegalPage(slug).then(d => {
      const f = toForm(d.page);
      setForm(f); setSaved(f);
    }).catch(err => toast.error(err.message || 'Failed to load page'));
  }, [slug]);

  const dirty = form && saved && (form.title !== saved.title || form.summary !== saved.summary || form.content !== saved.content
    || JSON.stringify(form.items) !== JSON.stringify(saved.items));
  const blocks = useMemo(() => parseLegal(fillPlaceholders(form?.content, settings)), [form?.content, settings]);

  const switchPage = (next) => {
    if (next === slug) return;
    if (dirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    setSlug(next);
  };

  const save = async (reset = false) => {
    if (reset && !window.confirm('Replace this page with the default text? Your edits will be lost.')) return;
    setSaving(true);
    try {
      if (!reset && isFaq && form.items.some(i => !i.question.trim())) { toast.error('Every FAQ needs a question'); setSaving(false); return; }
      const d = await settingsAPI.updateLegalPage(slug, reset ? { reset: true }
        : { title: form.title, summary: form.summary, ...(isFaq ? { items: form.items } : { content: form.content }) });
      const f = toForm(d.page);
      setForm(f); setSaved(f);
      toast.success(reset ? 'Default text restored' : 'Page published');
    } catch (err) { toast.error(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  // Toolbar: wrap selection in **bold**, or prefix the current line.
  const insert = (kind) => {
    const el = textRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    let next; let cursor;
    if (kind === 'bold') {
      const sel = value.slice(s, e) || 'bold text';
      next = `${value.slice(0, s)}**${sel}**${value.slice(e)}`;
      cursor = s + sel.length + 4;
    } else {
      const lineStart = value.lastIndexOf('\n', s - 1) + 1;
      const prefix = kind === 'heading' ? '## ' : '- ';
      next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
      cursor = s + prefix.length;
    }
    setForm(p => ({ ...p, content: next }));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursor, cursor); });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Footer Pages</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Privacy Policy, Terms & Conditions and FAQ shown in the website footer. Changes go live as soon as you publish.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PAGES.map(p => (
          <button key={p.slug} onClick={() => switchPage(p.slug)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${slug === p.slug ? 'bg-gray-900 dark:bg-gray-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
            {p.label}
          </button>
        ))}
        <a href={`/${slug}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
          View live page <FiExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {!form ? <div className="py-10 text-center text-gray-400">Loading...</div> : (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Page title</label>
              <input value={form.title} maxLength={120} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Short summary (under the title)</label>
              <input value={form.summary} maxLength={300} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} className={inputCls} /></div>
          </div>

          {isFaq ? <FaqItemsEditor items={form.items} onChange={items => setForm(p => ({ ...p, items }))} /> : (<>
          <div className="flex lg:hidden gap-2">
            <button onClick={() => setView('edit')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm ${view === 'edit' ? 'bg-gray-900 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}><FiEdit3 className="w-4 h-4" /> Edit</button>
            <button onClick={() => setView('preview')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm ${view === 'preview' ? 'bg-gray-900 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}><FiEye className="w-4 h-4" /> Preview</button>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className={view === 'preview' ? 'hidden lg:block' : ''}>
              <div className="flex items-center gap-1 rounded-t-lg border border-b-0 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-2 py-1.5">
                <button type="button" onClick={() => insert('heading')} title="Section heading" className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"><FiType className="w-4 h-4" /></button>
                <button type="button" onClick={() => insert('bullet')} title="Bullet point" className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"><FiList className="w-4 h-4" /></button>
                <button type="button" onClick={() => insert('bold')} title="Bold" className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"><FiBold className="w-4 h-4" /></button>
                <span className="ml-auto text-[11px] text-gray-400">{form.content.length.toLocaleString('en-IN')} chars</span>
              </div>
              <textarea ref={textRef} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                className="w-full h-[520px] px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-b-lg text-sm font-mono leading-6 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-y" />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                <code>## Heading</code> = new section · <code>- item</code> = bullet · <code>**text**</code> = bold · empty line = new paragraph.<br />
                Auto-filled from Settings: <code>{'{siteName}'}</code> <code>{'{contactEmail}'}</code> <code>{'{contactPhone}'}</code> <code>{'{address}'}</code>
              </p>
            </div>
            <div className={`${view === 'edit' ? 'hidden lg:block' : ''} rounded-lg border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 p-5 h-[560px] overflow-y-auto`}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Preview</p>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{form.title}</h1>
              {form.summary && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">{form.summary}</p>}
              <LegalContent blocks={blocks} />
            </div>
          </div>
          </>)}

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => save(false)} disabled={saving || !dirty || !form.title.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
              <FiSave className="w-4 h-4" /> {saving ? 'Publishing...' : 'Publish changes'}
            </button>
            <button onClick={() => save(true)} disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
              <FiRotateCcw className="w-4 h-4" /> Restore default text
            </button>
            <span className="text-xs text-gray-400">
              {dirty ? 'Unsaved changes' : form.updatedAt && `Last published ${new Date(form.updatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// FAQ list editor: category + question + answer per row, add / delete / move.
function FaqItemsEditor({ items, onChange }) {
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
  const update = (idx, key, value) => onChange(items.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  const remove = (idx) => { if (window.confirm('Delete this question?')) onChange(items.filter((_, i) => i !== idx)); };
  const move = (idx, dir) => {
    const to = idx + dir;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[idx], next[to]] = [next[to], next[idx]];
    onChange(next);
  };
  const add = () => onChange([...items, { category: categories[categories.length - 1] || 'General', question: '', answer: '' }]);

  return (
    <div className="space-y-3">
      <datalist id="faq-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {items.length} questions in {categories.length} categories. Questions are grouped by category on the page, in this order.
        Answers support <code>**bold**</code>, <code>- bullets</code> and <code>{'{contactEmail}'}</code>-style placeholders.
      </p>
      {items.map((it, idx) => (
        <div key={idx} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 w-6">{idx + 1}</span>
            <input list="faq-categories" value={it.category} onChange={e => update(idx, 'category', e.target.value)} placeholder="Category"
              className={`${inputCls} max-w-[200px]`} />
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} title="Move up" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-30"><FiArrowUp className="w-4 h-4" /></button>
              <button type="button" onClick={() => move(idx, 1)} disabled={idx === items.length - 1} title="Move down" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-30"><FiArrowDown className="w-4 h-4" /></button>
              <button type="button" onClick={() => remove(idx)} title="Delete" className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500"><FiTrash2 className="w-4 h-4" /></button>
            </div>
          </div>
          <input value={it.question} onChange={e => update(idx, 'question', e.target.value)} placeholder="Question"
            className={`${inputCls} font-semibold ${!it.question.trim() ? 'border-red-300 dark:border-red-500/50' : ''}`} />
          <textarea rows={3} value={it.answer} onChange={e => update(idx, 'answer', e.target.value)} placeholder="Answer"
            className={`${inputCls} resize-y`} />
        </div>
      ))}
      <button type="button" onClick={add}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-400">
        <FiPlus className="w-4 h-4" /> Add question
      </button>
    </div>
  );
}
