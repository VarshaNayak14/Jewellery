import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiX, FiZoomIn } from 'react-icons/fi';
import { useHomeProducts, getProductImage, getProductPrice, prettyCategory } from '../../hooks/useHomeData';
import { formatPrice } from '../../utils/helpers';
import './JewelleryGallery.css';

const ease = [0.2, 0.7, 0.2, 1];

export default function JewelleryGallery() {
  const [tab, setTab] = useState('All');
  const [open, setOpen] = useState(null); // index inside `list`

  // Everything below comes from the live product / category APIs
  const { products } = useHomeProducts(100);
  const PHOTOS = useMemo(() => {
    return products
      .map((p) => ({ p, src: getProductImage(p) }))
      .filter((x) => x.src)
      .slice(0, 10)
      .map(({ p, src }) => ({
        id: p._id,
        src,
        title: p.name,
        cat: p.subCategory || prettyCategory(p.category) || 'Jewellery',
        price: getProductPrice(p),
      }));
  }, [products]);
  const TABS = useMemo(() => ['All', ...Array.from(new Set(PHOTOS.map((x) => x.cat)))], [PHOTOS]);
  const list = tab === 'All' || !TABS.includes(tab) ? PHOTOS : PHOTOS.filter((x) => x.cat === tab);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d) => setOpen((i) => (i === null ? i : (i + d + list.length) % list.length)), [list.length]);

  // keyboard + body scroll lock while the lightbox is open
  useEffect(() => {
    if (open === null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, close, step]);

  const current = open !== null ? list[open] : null;

  if (!PHOTOS.length) return null;

  return (
    <section className="jg">
      <div className="jg-wrap">
        <div className="jg-head">
          <div className="jg-heading-copy">
            <motion.span className="jg-eyebrow" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>The jewellery edit</motion.span>
            <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}>
              Made to be <em>remembered</em>
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.15 }}>
              A closer look at the details, textures and pieces worth keeping.
            </motion.p>
          </div>
          <motion.div className="jg-line" initial={{ width: 0 }} whileInView={{ width: 70 }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.3 }} />
        </div>

        <div className="jg-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={`jg-tab ${tab === t ? 'is-on' : ''}`} onClick={() => setTab(t)}>
              {tab === t && <motion.span layoutId="jg-pill" className="jg-pill" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
              <span>{t}</span>
            </button>
          ))}
        </div>

        <motion.div className="jg-grid" layout>
          <AnimatePresence mode="popLayout">
            {list.map((p, i) => (
              <motion.button
                type="button"
                key={p.id}
                layout
                className="jg-item"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.55, delay: i * 0.05, ease }}
                onClick={() => setOpen(i)}
                aria-label={`View ${p.title}`}
              >
                <img src={p.src} alt={p.title} loading="lazy" />
                <span className="jg-over">
                  <FiZoomIn />
                  <strong>{p.title}</strong>
                  <small>{p.cat}{p.price ? ` · ${formatPrice(p.price)}` : ''}</small>
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {current && (
          <motion.div className="jg-lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
            <button type="button" className="jg-x" onClick={close} aria-label="Close"><FiX /></button>
            <button type="button" className="jg-nav jg-prev" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Previous"><FiChevronLeft /></button>
            <button type="button" className="jg-nav jg-next" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Next"><FiChevronRight /></button>
            <AnimatePresence mode="wait">
              <motion.figure
                key={current.id}
                className="jg-fig"
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease }}
                onClick={(e) => e.stopPropagation()}
              >
                <img src={current.src} alt={current.title} />
                <figcaption>
                  <strong>{current.title}</strong>
                  <span>{current.cat}{current.price ? ` · ${formatPrice(current.price)}` : ''} · {open + 1} / {list.length}</span>
                  <Link to={`/product/${current.id}`} className="jg-view" onClick={close}>View product</Link>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}