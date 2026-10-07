import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, animate, useMotionValue, useSpring } from 'framer-motion';
import { FiArrowRight, FiAward, FiHeart, FiRefreshCw, FiStar, FiUsers, FiGrid, FiMapPin, FiSmile } from 'react-icons/fi';
import { useHomeProducts, getProductImage } from '../../hooks/useHomeData';
import { offerAPI } from '../../services/api';
import InstagramHighlights from './InstagramHighlights';
import './HomeExtraSections.css';

const craft = [
  { icon: FiAward, title: 'Certified Quality', text: 'Every piece is checked and hallmarked before it reaches you.' },
  { icon: FiHeart, title: 'Handcrafted Detail', text: 'Skilled artisans finish each design by hand, stone by stone.' },
  { icon: FiRefreshCw, title: 'Easy Returns', text: 'Not in love? Return it hassle-free within 7 days.' },
];
const stats = [
  { icon: FiUsers, value: 50000, suffix: '+', label: 'Happy customers' },
  { icon: FiGrid, value: 10000, suffix: '+', label: 'Designs' },
  { icon: FiMapPin, value: 500, suffix: '+', label: 'Cities delivered' },
  { icon: FiSmile, value: 4.8, suffix: '★', label: 'Average rating', decimals: 1 },
];

const ease = [0.2, 0.7, 0.2, 1];
const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.8, delay, ease },
});

/* Word-by-word heading reveal + animated gold line */
function Head({ eyebrow, title, note }) {
  return (
    <div className="hx-head">
      <motion.span className="hx-eyebrow" {...reveal()}>{eyebrow}</motion.span>
      <motion.h2 {...reveal(0.1)}>{title}</motion.h2>
      <motion.div className="hx-line" initial={{ width: 0 }} whileInView={{ width: 70 }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.3 }} />
      {note && <motion.p {...reveal(0.25)}>{note}</motion.p>}
    </div>
  );
}

/* 3D tilt that follows the mouse */
function Tilt({ children, className, max = 8 }) {
  const rx = useMotionValue(0), ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 160, damping: 16 }), sy = useSpring(ry, { stiffness: 160, damping: 16 });
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * max * 2);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * max * 2);
  };
  const reset = () => { rx.set(0); ry.set(0); };
  return (
    <motion.div className={className} style={{ rotateX: sx, rotateY: sy, transformPerspective: 900 }} onMouseMove={onMove} onMouseLeave={reset}>
      {children}
    </motion.div>
  );
}

/* Count-up number */
function Counter({ value, suffix = '', decimals = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, { duration: 2, ease: 'easeOut', onUpdate: (v) => setN(v) });
    return () => c.stop();
  }, [inView, value]);
  return <span ref={ref}>{n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

export default function HomeExtraSections() {
  const [festivalOffers, setFestivalOffers] = useState([]);

  // Offer cards and product-led sections use live public data.
  const { products } = useHomeProducts(100);
  const withImg = products.filter((p) => getProductImage(p));
  const craftItems = craft.flatMap((item, index) => {
    const product = withImg[index];
    return product ? [{ ...item, image: getProductImage(product) }] : [];
  });
  const gallery = withImg.slice(0, 8).map((p) => ({ id: p._id, src: getProductImage(p), name: p.name }));

  useEffect(() => {
    let cancelled = false;
    offerAPI.getApproved({ placement: 'festival' })
      .then(({ offers }) => {
        if (cancelled || !Array.isArray(offers)) return;
        const items = (Array.isArray(offers) ? offers : [])
          .filter((offer) => (
            (offer.placement || (offer.tag || offer.description || offer.discountText ? 'festival' : 'homepage')) === 'festival'
            && offer.image
          ))
          .slice(0, 4);
        if (!cancelled) setFestivalOffers(items);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      

      {/* 3. Animated stats */}
      <section className="hx-stats">
        <div className="hx-wrap hx-stats-grid">
          {stats.map((s, i) => (
            <motion.div key={s.label} className="hx-stat" {...reveal(i * 0.1)}>
              <motion.span className="hx-stat-icon" animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}><s.icon /></motion.span>
              <strong><Counter value={s.value} suffix={s.suffix} decimals={s.decimals} /></strong>
              <small>{s.label}</small>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. Live homepage festival offers — bento layout that adapts to 1–4 offers */}
      {festivalOffers.length > 0 && (
        <section className="hx-fest">
          <div className="hx-fest-glow" aria-hidden="true" />
          <div className="hx-wrap">
            <div className="hx-fest-head">
              <motion.div {...reveal()}>
                <span className="hx-fest-eyebrow">A little celebration</span>
                <h2>Festival <em>offers</em></h2>
              </motion.div>
              <motion.div className="hx-fest-aside" {...reveal(0.1)}>
                <p>Find a little extra sparkle for every celebration — limited-time offers from our jewellers.</p>
                <Link to="/shop?isFlashSale=true" className="hx-fest-all">View all offers <FiArrowRight aria-hidden="true" /></Link>
              </motion.div>
            </div>

            <div className={`hx-fest-grid is-${festivalOffers.length}`}>
              {festivalOffers.map((offer, index) => {
                const card = (
                  <>
                    <img src={offer.image} alt={offer.title || offer.tag || 'Festival offer'} loading="lazy" />
                    <span className="hx-fest-shade" />
                    {offer.discountText && <span className="hx-fest-badge">{offer.discountText}</span>}
                    <span className="hx-fest-body">
                      {offer.tag && <small>{offer.tag}</small>}
                      {offer.title && <strong>{offer.title}</strong>}
                      {offer.description && <span className="hx-fest-desc">{offer.description}</span>}
                      <span className="hx-fest-cta">Shop the offer <FiArrowRight aria-hidden="true" /></span>
                    </span>
                  </>
                );
                return (
                  <motion.div key={offer._id} className="hx-fest-cell" {...reveal(index * 0.08)}>
                    {/^https?:\/\//i.test(offer.link || '')
                      ? <a className="hx-fest-card" href={offer.link} target="_blank" rel="noopener noreferrer">{card}</a>
                      : <Link className="hx-fest-card" to={offer.link || '/shop'}>{card}</Link>}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 5. Craftsmanship */}
      <section className="hx-section">
        <div className="hx-wrap">
          <Head eyebrow="Why TecAI Jewels" title={<>Crafted with <em>care & trust</em></>} note="Small details that make a big difference." />
          <div className="hx-craft">
            {craftItems.map((c, i) => (
              <motion.article key={c.title} className="hx-craft-card"
                initial={{ opacity: 0, y: 70 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.8, delay: i * 0.15, ease }}
                whileHover={{ y: -12 }}>
                <div className="hx-craft-img"><img src={c.image} alt="" loading="lazy" /></div>
                <span className="hx-craft-icon">
                  <motion.b className="hx-pulse" animate={{ scale: [1, 1.7], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }} />
                  <c.icon />
                </span>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
      

      {/* 6. Auto-scrolling gallery */}
      {gallery.length >= 3 && (
      <section className="hx-section hx-alt hx-gallery-section">
        <div className="hx-wrap"><Head eyebrow="#AurelleJewellery" title={<>Styled by you</>} note="Tag us to get featured." /></div>
        <div className="hx-marquee">
          <div className="hx-marquee-track">
            {[...gallery, ...gallery].map((g, i) => (
              <Link key={`${g.id}-${i}`} to={`/product/${g.id}`} className="hx-gal-item" aria-label={g.name}>
                <img src={g.src} alt={g.name} loading="lazy" />
                <span><FiStar /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      <InstagramHighlights />

     
    </>
  );
}