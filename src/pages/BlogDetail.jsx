import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiLink, FiShare2 } from 'react-icons/fi';
import { FaWhatsapp, FaFacebookF, FaPinterestP } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { blogAPI } from '../services/api';
import BlogContent, { parseBlocks } from '../components/blog/BlogContent';
import { BlogCard, BlogMeta } from './Blogs';
import '../components/blog/Blog.css';

export default function BlogDetail() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    setLoading(true);
    window.scrollTo(0, 0);
    blogAPI.getBySlug(slug)
      .then((d) => { setBlog(d.blog); setRelated(d.related || []); })
      .catch(() => setBlog(null))
      .finally(() => setLoading(false));
  }, [slug]);

  // Title + description for sharing / search.
  useEffect(() => {
    if (!blog) return undefined;
    const prevTitle = document.title;
    document.title = blog.metaTitle || blog.title;
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute('content');
    meta?.setAttribute('content', blog.metaDescription || blog.excerpt || '');
    return () => { document.title = prevTitle; if (meta && prevDesc != null) meta.setAttribute('content', prevDesc); };
  }, [blog]);

  // "In this article" — same ids BlogContent puts on each ## heading.
  const toc = useMemo(() => (blog
    ? parseBlocks(blog.content).map((b, i) => (b.type === 'h2' ? { id: `s-${i}`, text: b.text.replace(/\*\*/g, '') } : null)).filter(Boolean)
    : []), [blog]);

  // Reading progress + active section.
  useEffect(() => {
    if (!blog) return undefined;
    const onScroll = () => {
      const el = document.getElementById('jb-article');
      if (el) {
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight * 0.6;
        setProgress(Math.min(100, Math.max(0, (-rect.top / Math.max(total, 1)) * 100)));
      }
      let current = '';
      toc.forEach(({ id }) => {
        const h = document.getElementById(id);
        if (h && h.getBoundingClientRect().top < 180) current = id;
      });
      setActiveId(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [blog, toc]);

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); toast.success('Link copied'); } catch { toast.error('Could not copy link'); }
  };
  const nativeShare = async () => {
    if (navigator.share) { try { await navigator.share({ title: blog.title, url }); } catch { /* closed */ } } else copyLink();
  };

  if (loading) {
    return (
      <main className="jblog min-h-screen">
        <div className="h-[460px] animate-pulse" style={{ background: 'var(--jb-cream)' }} />
        <div className="max-w-3xl mx-auto px-4 py-12 space-y-4 animate-pulse">
          {[100, 92, 96, 80].map((w) => <div key={w} className="h-4 rounded" style={{ width: `${w}%`, background: 'var(--jb-cream)' }} />)}
        </div>
      </main>
    );
  }

  if (!blog) {
    return (
      <main className="jblog min-h-[70vh] flex items-center justify-center px-4 text-center">
        <div>
          <span className="jb-eyebrow">404</span>
          <h1 className="jb-serif text-4xl font-medium mt-2">This story isn't available.</h1>
          <Link to="/blogs" className="jb-pill jb-pill--dark mt-6">Back to the journal <FiArrowRight className="w-4 h-4" /></Link>
        </div>
      </main>
    );
  }

  const shareButtons = [
    { label: 'WhatsApp', icon: FaWhatsapp, href: `https://wa.me/?text=${encodeURIComponent(`${blog.title} ${url}`)}` },
    { label: 'Facebook', icon: FaFacebookF, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: 'Pinterest', icon: FaPinterestP, href: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(blog.coverImage || '')}&description=${encodeURIComponent(blog.title)}` },
  ];

  return (
    <main className="jblog min-h-screen">
      <div className="jb-progress" style={{ width: `${progress}%` }} />

      {/* ── Hero ─────────────────────────────────────────── */}
      <header className="jb-article-hero">
        <img src={blog.coverImage || '/jewelry/campaign.jpg'} alt="" />
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-12 md:pb-16 text-center">
          <Link to="/blogs" className="inline-flex items-center gap-1.5 text-sm text-[#efe3cc] hover:text-white mb-8"><FiArrowLeft className="w-4 h-4" /> The Journal</Link>
          <div><Link to={`/blogs?category=${encodeURIComponent(blog.category)}`} className="jb-eyebrow">{blog.category}</Link></div>
          <h1 className="jb-serif jb-article-title mt-4 max-w-4xl mx-auto">{blog.title}</h1>
          <div className="flex justify-center mt-6"><BlogMeta blog={blog} light /></div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20">
        <div className="grid lg:grid-cols-[64px_minmax(0,720px)_1fr] gap-10 xl:gap-16 justify-center">
          {/* Share rail */}
          <div className="hidden lg:block">
            <div className="sticky flex flex-col items-center gap-3" style={{ top: 'calc(var(--navbar-height, 96px) + 40px)' }}>
              <span className="text-[10px] uppercase tracking-[0.2em] jb-muted mb-1">Share</span>
              {shareButtons.map(({ label, icon: Icon, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="jb-share" aria-label={`Share on ${label}`}><Icon className="w-4 h-4" /></a>
              ))}
              <button onClick={copyLink} className="jb-share" aria-label="Copy link"><FiLink className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Article */}
          <article id="jb-article" className="min-w-0">
            {blog.excerpt && (
              <p className="jb-serif text-2xl md:text-[28px] leading-snug mb-10 pb-10" style={{ color: 'var(--jb-ink)', borderBottom: '1px solid var(--jb-line)' }}>
                {blog.excerpt}
              </p>
            )}
            <BlogContent content={blog.content} />

            {(blog.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-12">
                {blog.tags.map((t) => <span key={t} className="jb-tag">#{t}</span>)}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 mt-10 pt-8" style={{ borderTop: '1px solid var(--jb-line)' }}>
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-full flex items-center justify-center jb-serif text-xl font-semibold text-white" style={{ background: 'linear-gradient(135deg,#c99a52,#8b6835)' }}>
                  {(blog.authorName || 'J').charAt(0)}
                </span>
                <div>
                  <p className="text-xs jb-muted uppercase tracking-[0.16em]">Written by</p>
                  <p className="font-semibold">{blog.authorName || 'Editorial Team'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:hidden">
                {shareButtons.slice(0, 1).map(({ label, icon: Icon, href }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="jb-share" aria-label={`Share on ${label}`}><Icon className="w-4 h-4" /></a>
                ))}
                <button onClick={nativeShare} className="jb-share" aria-label="Share"><FiShare2 className="w-4 h-4" /></button>
              </div>
            </div>
          </article>

          {/* Contents + promo */}
          <aside className="hidden lg:block">
            <div className="sticky space-y-8" style={{ top: 'calc(var(--navbar-height, 96px) + 40px)' }}>
              {toc.length > 1 && (
                <nav className="jb-toc">
                  <p className="text-[11px] uppercase tracking-[0.2em] jb-muted mb-3">In this article</p>
                  {toc.map((t) => (
                    <a key={t.id} href={`#${t.id}`} className={activeId === t.id ? 'is-active' : ''}
                      onClick={(e) => { e.preventDefault(); document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth' }); }}>
                      {t.text}
                    </a>
                  ))}
                </nav>
              )}
              <Link to="/shop" className="jb-promo group !min-h-[300px]">
                <img src="/jewelry/necklace.jpg" alt="" className="transition-transform duration-700 group-hover:scale-105" />
                <div>
                  <span className="jb-eyebrow !text-[#e9c987]">Shop the story</span>
                  <p className="jb-serif text-2xl font-medium mt-2 leading-tight">Find a piece you'll treasure.</p>
                  <span className="inline-flex items-center gap-2 mt-3 text-sm font-semibold">Explore <FiArrowRight className="w-4 h-4" /></span>
                </div>
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Related ──────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="py-16 md:py-20" style={{ background: 'var(--jb-cream)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="jb-h">
              <h2 className="jb-serif">You may also like</h2>
              <Link to="/blogs" className="text-sm font-semibold inline-flex items-center gap-1" style={{ color: 'var(--jb-gold)' }}>All stories <FiArrowRight className="w-4 h-4" /></Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {related.map((b, i) => <BlogCard key={b._id} blog={b} index={i} />)}
            </div>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="jb-band">
          <img src="/jewelry/gold-detail.jpg" alt="" />
          <div>
            <span className="jb-eyebrow !text-[#e9c987]">From the journal to your jewellery box</span>
            <h2 className="jb-serif text-4xl md:text-5xl font-medium mt-3">Explore hallmarked jewellery.</h2>
            <div className="flex flex-wrap justify-center gap-3 mt-7">
              <Link to="/shop" className="jb-pill jb-pill--light">Shop now <FiArrowRight className="w-4 h-4" /></Link>
              <Link to="/nearby" className="jb-pill border border-white/30 text-[#fff8ea] hover:bg-white/10">Jewellers near me</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
