import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiEye, FiExternalLink, FiImage, FiLink,
  FiBold, FiList, FiType, FiMessageSquare, FiStar, FiFileText,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { blogAPI, uploadAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import ImageUploadInput from '../../components/common/ImageUploadInput';
import ToggleSwitch from '../../components/common/ToggleSwitch';
import BlogContent from '../../components/blog/BlogContent';
import '../../components/blog/Blog.css';

const CATEGORIES = ['Style Guide', 'Bridal', 'Gold Guide', 'Diamond Guide', 'Jewellery Care', 'Trends', 'Gifting', 'Festive', 'Behind the Craft'];

const emptyForm = {
  title: '', slug: '', excerpt: '', content: '', coverImage: '', category: 'Style Guide',
  tags: '', status: 'draft', isFeatured: false, metaTitle: '', metaDescription: '', authorName: '',
};

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100';
const labelCls = 'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/* Image field: URL box + upload button + preview — used for the cover. */
function ImageField({ value, onChange }) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Paste image URL  https://…" className={`${inputCls} pl-9`} />
        </div>
        <ImageUploadInput label="Upload image" uploadFn={(files) => uploadAPI.single(files[0]).then((r) => [r.url])} onUploaded={(urls) => onChange(urls[0])} />
      </div>
      {value ? (
        <div className="relative mt-3 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 aspect-[16/7] bg-gray-100 dark:bg-gray-800">
          <img src={value} alt="Cover preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.opacity = 0.2; }} />
          <button type="button" onClick={() => onChange('')} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white" aria-label="Remove image">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 aspect-[16/7] flex flex-col items-center justify-center text-gray-400 text-sm">
          <FiImage className="w-6 h-6 mb-1" /> No cover image yet
        </div>
      )}
    </div>
  );
}

function BlogEditor({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [imgUrl, setImgUrl] = useState('');
  const contentRef = useRef(null);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  // Insert markup at the cursor in the content box.
  const insert = (before, after = '', placeholder = '') => {
    const el = contentRef.current;
    const start = el?.selectionStart ?? form.content.length;
    const end = el?.selectionEnd ?? form.content.length;
    const selected = form.content.slice(start, end) || placeholder;
    const next = form.content.slice(0, start) + before + selected + after + form.content.slice(end);
    setForm((p) => ({ ...p, content: next }));
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + before.length + selected.length + after.length;
      el?.setSelectionRange(pos, pos);
    });
  };
  const insertBlock = (text) => insert(`${form.content && !form.content.endsWith('\n') ? '\n\n' : ''}${text}\n\n`);
  const insertImage = (url) => { if (url) insertBlock(`![Image caption](${url})`); setImgUrl(''); };

  const save = async (status) => {
    if (!form.title.trim() || !form.content.trim()) return toast.error('Title and content are required');
    setSaving(true);
    try {
      const payload = { ...form, status: status || form.status };
      const res = form._id ? await blogAPI.update(form._id, payload) : await blogAPI.create(payload);
      toast.success(payload.status === 'published' ? 'Blog published' : 'Draft saved');
      onSaved(res.blog);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tools = [
    { icon: FiType, label: 'Heading', run: () => insertBlock('## Section heading') },
    { icon: FiType, label: 'Sub-heading', small: true, run: () => insertBlock('### Sub heading') },
    { icon: FiBold, label: 'Bold', run: () => insert('**', '**', 'bold text') },
    { icon: FiList, label: 'List', run: () => insertBlock('- First point\n- Second point') },
    { icon: FiMessageSquare, label: 'Quote', run: () => insertBlock('> A line worth remembering') },
    { icon: FiLink, label: 'Link', run: () => insert('[', '](https://)', 'link text') },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-2 sm:p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-6xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl my-2">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 rounded-t-3xl z-10">
          <div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{form._id ? 'Edit blog' : 'New blog'}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{form.status === 'published' ? 'Published — changes go live on save' : 'Draft — only visible here'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => save('draft')} disabled={saving} className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
              {form.status === 'published' ? 'Unpublish' : 'Save draft'}
            </button>
            <button onClick={() => save('published')} disabled={saving} className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50">
              {saving ? 'Saving…' : form.status === 'published' ? 'Update' : 'Publish'}
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" aria-label="Close"><FiX className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6 p-5 sm:p-6">
          {/* Main column */}
          <div className="space-y-4 min-w-0">
            <input value={form.title} onChange={set('title')} placeholder="Blog title — e.g. How to choose the right gold purity"
              className="w-full text-2xl font-semibold bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 pb-3 focus:outline-none focus:border-amber-500 text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600" />
            <div>
              <label className={labelCls}>Short summary (shown on cards)</label>
              <textarea value={form.excerpt} onChange={set('excerpt')} rows={2} maxLength={400} placeholder="One or two lines that make people want to read on…" className={`${inputCls} resize-none`} />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className={`${labelCls} !mb-0`}>Content</label>
                <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 p-0.5 text-xs">
                  {['Write', 'Preview'].map((t) => (
                    <button key={t} type="button" onClick={() => setPreview(t === 'Preview')}
                      className={`px-3 py-1.5 rounded-lg font-medium ${(t === 'Preview') === preview ? 'bg-amber-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>{t}</button>
                  ))}
                </div>
              </div>

              {!preview && (
                <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-t-xl border border-b-0 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                  {tools.map(({ icon: Icon, label, run, small }) => (
                    <button key={label} type="button" onClick={run} title={label}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700">
                      <Icon className={small ? 'w-3 h-3' : 'w-3.5 h-3.5'} /> {label}
                    </button>
                  ))}
                  <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
                  <div className="flex items-center gap-1">
                    <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="Image URL"
                      className="w-32 sm:w-44 px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200" />
                    <button type="button" onClick={() => insertImage(imgUrl.trim())} disabled={!imgUrl.trim()}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-40">Add</button>
                    <ImageUploadInput label="Upload" uploadFn={(files) => uploadAPI.single(files[0]).then((r) => [r.url])} onUploaded={(urls) => insertImage(urls[0])} />
                  </div>
                </div>
              )}

              {preview ? (
                <div className="min-h-[420px] rounded-xl border border-gray-200 dark:border-gray-700 p-5 bg-[#fffdf8] dark:bg-gray-950">
                  {form.content.trim() ? <BlogContent content={form.content} /> : <p className="text-sm text-gray-400">Nothing to preview yet.</p>}
                </div>
              ) : (
                <textarea ref={contentRef} value={form.content} onChange={set('content')} rows={18}
                  placeholder={'Start writing…\n\n## A section heading\nA paragraph of text. Use **bold** for emphasis.\n\n- A list item\n- Another one\n\n![Caption](https://image-url)'}
                  className="w-full px-4 py-3 rounded-b-xl border border-gray-200 dark:border-gray-700 text-sm leading-relaxed font-mono bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y min-h-[420px]" />
              )}
              <p className="text-[11px] text-gray-400 mt-1.5">
                ## heading · ### sub-heading · **bold** · *italic* · - list · 1. numbered · &gt; quote · ![caption](image-url) · [text](link)
              </p>
            </div>
          </div>

          {/* Side column */}
          <aside className="space-y-4">
            <div>
              <label className={labelCls}>Cover image</label>
              <ImageField value={form.coverImage} onChange={(coverImage) => setForm((p) => ({ ...p, coverImage }))} />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <input list="blog-categories" value={form.category} onChange={set('category')} className={inputCls} placeholder="Pick or type" />
              <datalist id="blog-categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className={labelCls}>Tags (comma separated)</label>
              <input value={form.tags} onChange={set('tags')} className={inputCls} placeholder="gold, 22k, bridal" />
            </div>
            <div>
              <label className={labelCls}>Author name</label>
              <input value={form.authorName} onChange={set('authorName')} className={inputCls} placeholder="Shown under the title" />
            </div>
            <div>
              <label className={labelCls}>URL slug</label>
              <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden">
                <span className="pl-3 text-xs text-gray-400">/blogs/</span>
                <input value={form.slug} onChange={set('slug')} placeholder="auto from title" className="flex-1 min-w-0 px-1 py-2.5 text-sm bg-transparent focus:outline-none text-gray-800 dark:text-gray-100" />
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-3">
              <ToggleSwitch checked={form.isFeatured} onChange={(v) => setForm((p) => ({ ...p, isFeatured: v }))} label="Feature at top of Blogs page" color="bg-amber-600" />
            </div>
            <details className="rounded-2xl border border-gray-200 dark:border-gray-700 p-3 group">
              <summary className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">SEO (optional)</summary>
              <div className="space-y-3 mt-3">
                <div>
                  <label className={labelCls}>Meta title</label>
                  <input value={form.metaTitle} onChange={set('metaTitle')} className={inputCls} placeholder={form.title || 'Defaults to the blog title'} />
                </div>
                <div>
                  <label className={labelCls}>Meta description</label>
                  <textarea value={form.metaDescription} onChange={set('metaDescription')} rows={3} className={`${inputCls} resize-none`} placeholder={form.excerpt || 'Defaults to the summary'} />
                </div>
              </div>
            </details>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminBlogs({ Wrapper = AdminPageWrapper }) {
  const [blogs, setBlogs] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await blogAPI.adminGetAll({ status: status || undefined, search: search || undefined, limit: 50 });
      setBlogs(d.blogs || []);
      setCounts(d.counts || {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [status, search]);

  const openNew = () => setEditing({ ...emptyForm });
  const openEdit = (b) => setEditing({
    ...emptyForm,
    ...b,
    tags: (b.tags || []).join(', '),
    excerpt: b.excerpt || '',
    coverImage: b.coverImage || '',
    metaTitle: b.metaTitle || '',
    metaDescription: b.metaDescription || '',
    authorName: b.authorName || '',
  });

  const remove = async (b) => {
    if (!window.confirm(`Delete "${b.title}"? This cannot be undone.`)) return;
    try {
      await blogAPI.remove(b._id);
      toast.success('Blog deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const total = (counts.published || 0) + (counts.draft || 0);

  return (
    <Wrapper title="Blogs" subtitle="Write jewellery guides, trends & stories — shown under Blogs in the main menu">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 p-1 bg-white dark:bg-gray-900 text-sm">
          {[['', `All (${total})`], ['published', `Published (${counts.published || 0})`], ['draft', `Drafts (${counts.draft || 0})`]].map(([v, l]) => (
            <button key={v} onClick={() => setStatus(v)}
              className={`px-3 py-1.5 rounded-lg font-medium ${status === v ? 'bg-amber-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles…" className={`${inputCls} pl-9`} />
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold whitespace-nowrap">
            <FiPlus className="w-4 h-4" /> New blog
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <FiFileText className="w-10 h-10 text-amber-600 mx-auto mb-3" />
          <p className="font-medium text-gray-700 dark:text-gray-200">No blogs {status ? `(${status})` : 'yet'}</p>
          <button onClick={openNew} className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-300 hover:underline">+ Write the first one</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {blogs.map((b) => (
            <div key={b._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm flex flex-col">
              <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-800">
                {b.coverImage ? <img src={b.coverImage} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><FiImage className="w-8 h-8" /></div>}
                <span className={`absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full ${b.status === 'published' ? 'bg-emerald-500 text-white' : 'bg-gray-800/80 text-white'}`}>
                  {b.status === 'published' ? 'Published' : 'Draft'}
                </span>
                {b.isFeatured && <span className="absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500 text-white flex items-center gap-1"><FiStar className="w-3 h-3" /> Featured</span>}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <p className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold">{b.category}</p>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mt-1 line-clamp-2">{b.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{b.excerpt}</p>
                <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-auto pt-3">
                  <span>{b.status === 'published' ? fmtDate(b.publishedAt) : `Edited ${fmtDate(b.updatedAt)}`}</span>
                  <span className="flex items-center gap-1"><FiEye className="w-3 h-3" /> {b.views || 0}</span>
                  <span>{b.authorName || b.author?.name}</span>
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={() => openEdit(b)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10">
                    <FiEdit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  {b.status === 'published' && (
                    <a href={`/blogs/${b.slug}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <FiExternalLink className="w-3.5 h-3.5" /> View
                    </a>
                  )}
                  <button onClick={() => remove(b)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" aria-label="Delete">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <BlogEditor
            initial={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); load(); }}
          />
        )}
      </AnimatePresence>
    </Wrapper>
  );
}
