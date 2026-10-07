import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiArrowUpRight, FiSearch, FiX, FiChevronRight } from 'react-icons/fi';
import { blogAPI } from '../services/api';
import '../components/blog/Blog.css';

export const fmtBlogDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const Cover = ({ src, alt }) => (src ? <img src={src} alt={alt || ''} loading="lazy" /> : <div className="jb-placeholder" />);

export function BlogMeta({ blog, light }) {
  return (
    <div className="jb-meta" style={light ? { color: 'rgba(255,248,234,0.8)' } : undefined}>
      {blog.authorName && <span>{blog.authorName}</span>}
      {blog.authorName && <i />}
      <span>{fmtBlogDate(blog.publishedAt)}</span>
      <i />
      <span>{blog.readMinutes || 1} min read</span>
    </div>
  );
}

export function BlogCard({ blog, index = 0, ratio = 'aspect-[4/3]', big }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: (index % 3) * 0.07, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="jb-card"
    >
      <Link to={`/blogs/${blog.slug}`} className={`jb-card__img ${ratio}`}>
        <Cover src={blog.coverImage} alt={blog.title} />
        {blog.category && <span className="jb-card__tag">{blog.category}</span>}
      </Link>
      <div className="pt-5">
        <BlogMeta blog={blog} />
        <Link to={`/blogs/${blog.slug}`}>
          <h3 className={`jb-serif jb-card__title mt-2 ${big ? '!text-[34px]' : ''}`}>{blog.title}</h3>
        </Link>
        {blog.excerpt && <p className="jb-card__excerpt mt-3 line-clamp-3">{blog.excerpt}</p>}
      </div>
    </motion.article>
  );
}

function RowCard({ blog }) {
  return (
    <article className="jb-row jb-card">
      <Link to={`/blogs/${blog.slug}`} className="jb-card__img aspect-[4/3] sm:aspect-square">
        <Cover src={blog.coverImage} alt={blog.title} />
      </Link>
      <div className="flex flex-col justify-center">
        <span className="jb-eyebrow">{blog.category}</span>
        <Link to={`/blogs/${blog.slug}`}><h3 className="jb-serif jb-card__title mt-2">{blog.title}</h3></Link>
        {blog.excerpt && <p className="jb-card__excerpt mt-3 line-clamp-2">{blog.excerpt}</p>}
        <div className="flex items-center justify-between gap-4 mt-4">
          <BlogMeta blog={blog} />
          <Link to={`/blogs/${blog.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--jb-gold)' }}>
            Read <FiArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function Blogs() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page')) || 1;

  const [input, setInput] = useState(q);
  const [data, setData] = useState({ blogs: [], categories: [], pages: 1, total: 0 });
  const [popular, setPopular] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setInput(q); }, [q]);

  useEffect(() => {
    blogAPI.getAll({ sort: 'popular', limit: 5 })
      .then((d) => { setPopular(d.blogs || []); setAllCategories(d.categories || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    blogAPI.getAll({ category: category || undefined, search: q || undefined, page, limit: 9 })
      .then((d) => setData({ blogs: d.blogs || [], categories: d.categories || [], pages: d.pages || 1, total: d.total || 0 }))
      .catch(() => setData({ blogs: [], categories: [], pages: 1, total: 0 }))
      .finally(() => setLoading(false));
  }, [category, q, page]);

  const setParam = (next) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (!('page' in next)) p.delete('page');
    setParams(p);
    if ('page' in next) window.scrollTo({ top: 520, behavior: 'smooth' });
  };

  const filtered = Boolean(category || q);
  const isFirstPage = page === 1 && !filtered;
  const hero = isFirstPage ? data.blogs[0] : null;
  const rest = hero ? data.blogs.slice(1) : data.blogs;
  const topPair = isFirstPage ? rest.slice(0, 2) : [];
  const listItems = isFirstPage ? rest.slice(2) : rest;
  const categories = allCategories.length ? allCategories : data.categories;

  return (
    <main className="jblog min-h-screen">
      {/* ── Hero ───────────────────────────────────────────── */}
      {hero ? (
        <section className="jb-hero flex items-end">
          {hero.coverImage ? <img src={hero.coverImage} alt="" className="jb-hero__img" /> : <img src="/jewelry/campaign.jpg" alt="" className="jb-hero__img" />}
          <div className="jb-hero__shade" />
          <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-10 md:pt-20 md:pb-12">
            <nav className="jb-hero-crumb" aria-label="Breadcrumb">
              <Link to="/">Home</Link><FiChevronRight /><span>Jewellery Journal</span>
            </nav>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-3xl">
              <span className="jb-eyebrow">The Jewellery Journal · {hero.isFeatured ? 'Featured' : 'Latest'}</span>
              <h1 className="jb-serif jb-hero__title mt-4">{hero.title}</h1>
              {hero.excerpt && <p className="mt-5 text-base md:text-lg text-[#efe3cc] max-w-2xl line-clamp-3">{hero.excerpt}</p>}
              <div className="flex flex-wrap items-center gap-5 mt-7">
                <Link to={`/blogs/${hero.slug}`} className="jb-pill jb-pill--light">Read the story <FiArrowRight className="w-4 h-4" /></Link>
                <BlogMeta blog={hero} light />
              </div>
            </motion.div>
          </div>
        </section>
      ) : (
        <section className="jb-hero flex items-end">
          <img src="/jewelry/campaign.jpg" alt="" className="jb-hero__img" />
          <div className="jb-hero__shade" />
          <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-10 md:pt-20 md:pb-12">
            <nav className="jb-hero-crumb" aria-label="Breadcrumb">
              <Link to="/">Home</Link><FiChevronRight /><span>Jewellery Journal</span>
            </nav>
            <span className="jb-eyebrow">The Jewellery Journal</span>
            <h1 className="jb-serif jb-hero__title mt-3">
              {q ? <>Results for “{q}”</> : category || 'Stories, guides & jewellery wisdom'}
            </h1>
            {!loading && <p className="mt-4 text-[#efe3cc]">{data.total} article{data.total === 1 ? '' : 's'}</p>}
          </div>
        </section>
      )}

      {/* ── Category tabs + search ─────────────────────────── */}
      <div className="jb-tabs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-6">
          <div className="flex-1 min-w-0 flex gap-7 overflow-x-auto no-scrollbar">
            <button onClick={() => setParam({ category: '' })} className={`jb-tab ${!category ? 'is-active' : ''}`}>All stories</button>
            {categories.map((c) => (
              <button key={c.name} onClick={() => setParam({ category: c.name })} className={`jb-tab ${category === c.name ? 'is-active' : ''}`}>{c.name}</button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setParam({ q: input.trim() }); }} className="jb-search hidden md:flex w-64 flex-shrink-0">
            <FiSearch className="w-4 h-4 jb-muted" />
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search the journal" />
            {q && <button type="button" onClick={() => setParam({ q: '' })} aria-label="Clear search"><FiX className="w-4 h-4 jb-muted" /></button>}
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <form onSubmit={(e) => { e.preventDefault(); setParam({ q: input.trim() }); }} className="jb-search md:hidden mb-8">
          <FiSearch className="w-4 h-4 jb-muted" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search the journal" />
        </form>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-8">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-4 animate-pulse">
                <div className="aspect-[4/3] rounded-[18px]" style={{ background: 'var(--jb-cream)' }} />
                <div className="h-3 w-40 rounded" style={{ background: 'var(--jb-cream)' }} />
                <div className="h-7 w-4/5 rounded" style={{ background: 'var(--jb-cream)' }} />
              </div>
            ))}
          </div>
        ) : data.blogs.length === 0 ? (
          <div className="grid md:grid-cols-2 gap-10 items-center py-6">
            <div className="jb-card__img aspect-[4/3]"><img src="/jewelry/ring.jpg" alt="" /></div>
            <div>
              <span className="jb-eyebrow">{filtered ? 'Nothing here yet' : 'Coming soon'}</span>
              <h2 className="jb-serif text-4xl md:text-5xl font-medium mt-3 leading-tight">
                {filtered ? 'No stories match that search.' : 'Our first stories are being written.'}
              </h2>
              <p className="jb-card__excerpt mt-4 !text-base">
                {filtered ? 'Try a different word or browse every story.' : 'Guides on gold purity, diamonds, bridal sets and jewellery care are on their way.'}
              </p>
              <div className="flex flex-wrap gap-3 mt-7">
                {filtered && <button onClick={() => setParams({})} className="jb-pill jb-pill--dark">All stories</button>}
                <Link to="/shop" className="jb-pill jb-topic !py-3 !px-6">Shop jewellery <FiArrowRight className="w-4 h-4" /></Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_340px] gap-12 xl:gap-16">
            {/* ── Main column ─────────────────────────────── */}
            <div className="min-w-0">
              {topPair.length > 0 && (
                <>
                  <div className="jb-h"><h2 className="jb-serif">Latest stories</h2><span className="text-sm jb-muted">{data.total} articles</span></div>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-12 mb-14">
                    {topPair.map((b, i) => <BlogCard key={b._id} blog={b} index={i} ratio="aspect-[4/5]" />)}
                  </div>
                </>
              )}

              {listItems.length > 0 && (
                <>
                  {topPair.length > 0
                    ? <div className="jb-h !border-0 !mb-0"><h2 className="jb-serif">More to read</h2></div>
                    : <div className="jb-h !mb-0"><h2 className="jb-serif">{q ? `Results for “${q}”` : category || 'All stories'}</h2><span className="text-sm jb-muted">{data.total} articles</span></div>}
                  <div>{listItems.map((b) => <RowCard key={b._id} blog={b} />)}</div>
                </>
              )}

              {data.pages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-12 flex-wrap">
                  <button className="jb-page" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })}>← Newer</button>
                  {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setParam({ page: p === 1 ? '' : String(p) })} className={`jb-page ${p === page ? 'is-active' : ''}`}>{p}</button>
                  ))}
                  <button className="jb-page" disabled={page >= data.pages} onClick={() => setParam({ page: String(page + 1) })}>Older →</button>
                </div>
              )}
            </div>

            {/* ── Sidebar ─────────────────────────────────── */}
            <aside className="space-y-8 lg:sticky lg:self-start" style={{ top: 'calc(var(--navbar-height, 96px) + 80px)' }}>
              {popular.length > 0 && (
                <div className="jb-side">
                  <h3 className="jb-serif">Most read</h3>
                  {popular.map((b, i) => (
                    <Link key={b._id} to={`/blogs/${b.slug}`} className="jb-popular">
                      <span className="jb-serif jb-popular__n">{String(i + 1).padStart(2, '0')}</span>
                      <span className="jb-popular__t line-clamp-2">{b.title}</span>
                      <Cover src={b.coverImage} alt="" />
                    </Link>
                  ))}
                </div>
              )}

              {categories.length > 0 && (
                <div className="jb-side">
                  <h3 className="jb-serif">Explore topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <button key={c.name} onClick={() => setParam({ category: c.name })} className={`jb-topic ${category === c.name ? 'is-active' : ''}`}>
                        {c.name} <span className="opacity-60">{c.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Link to="/shop" className="jb-promo group">
                <img src="/jewelry/necklace.jpg" alt="" className="transition-transform duration-700 group-hover:scale-105" />
                <div>
                  <span className="jb-eyebrow !text-[#e9c987]">Shop the story</span>
                  <p className="jb-serif text-3xl font-medium mt-2 leading-tight">Hallmarked pieces, made to be treasured.</p>
                  <span className="inline-flex items-center gap-2 mt-4 text-sm font-semibold">Explore jewellery <FiArrowRight className="w-4 h-4" /></span>
                </div>
              </Link>
            </aside>
          </div>
        )}
      </div>

      {/* ── Bottom band ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="jb-band">
          <img src="/jewelry/gold-detail.jpg" alt="" />
          <div>
            <span className="jb-eyebrow !text-[#e9c987]">Visit a showroom</span>
            <h2 className="jb-serif text-4xl md:text-5xl font-medium mt-3">See it, try it, love it in person.</h2>
            <p className="text-[#e6d8bd] mt-3 max-w-xl mx-auto">Find trusted, hallmark-certified jewellers near you.</p>
            <Link to="/nearby" className="jb-pill jb-pill--light mt-7">Jewellers near me <FiArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
