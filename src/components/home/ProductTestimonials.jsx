import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiStar, FiPlay, FiX, FiArrowLeft, FiArrowRight, FiVolume2 } from 'react-icons/fi';
import { reviewAPI } from '../../services/api';
import './ProductTestimonials.css';

const Stars = ({ value, size = 14 }) => (
  <span className="lt-stars" aria-label={`${value} out of 5 stars`}>
    {Array.from({ length: 5 }, (_, i) => (
      <FiStar key={i} aria-hidden="true" style={{ width: size, height: size }} className={i < Math.round(value) ? 'is-on' : ''} />
    ))}
  </span>
);

const firstName = (r) => r.user?.name || 'Customer';
const initials = (r) => firstName(r).split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

function Customer({ review, light }) {
  return (
    <div className={`lt-customer ${light ? 'is-light' : ''}`}>
      {review.user?.avatar ? <img src={review.user.avatar} alt="" loading="lazy" /> : <span>{initials(review)}</span>}
      <div>
        <strong>{firstName(review)}</strong>
        <small>
          {review.isDemo ? 'Sample review' : review.isVerifiedPurchase ? 'Verified buyer' : 'Customer'}
        </small>
      </div>
    </div>
  );
}

/* Tall reel-style card: muted preview on hover, full video with sound on click */
function VideoCard({ review, onOpen }) {
  const ref = useRef(null);
  const play = () => { const v = ref.current; if (v) { v.currentTime = 0; v.play().catch(() => {}); } };
  const stop = () => { const v = ref.current; if (v) v.pause(); };
  return (
    <article className="lt-card lt-video" onMouseEnter={play} onMouseLeave={stop}>
      <button type="button" className="lt-video__btn" onClick={() => onOpen(review)} aria-label={`Play video review by ${firstName(review)}`}>
        <video ref={ref} src={review.videos[0]} muted loop playsInline preload="metadata"
          poster={review.images?.[0] || review.product?.images?.[0]} />
        <span className="lt-video__shade" />
        <span className="lt-video__tag"><FiPlay /> Video review</span>
        <span className="lt-play"><FiPlay /></span>
        <span className="lt-video__body">
          <Stars value={review.rating} />
          {review.title && <b>{review.title}</b>}
          <Customer review={review} light />
        </span>
      </button>
    </article>
  );
}

function QuoteCard({ review }) {
  const photo = review.images?.[0] || review.product?.images?.[0];
  return (
    <article className="lt-card lt-quote">
      {photo && (
        <Link to={`/product/${review.product?._id}`} className="lt-quote__img">
          <img src={photo} alt={review.product?.name || ''} loading="lazy" />
        </Link>
      )}
      <div className="lt-quote__body">
        <Stars value={review.rating} />
        {review.title && <h3>{review.title}</h3>}
        {review.comment && <p>{review.comment}</p>}
        <div className="lt-quote__foot">
          <Customer review={review} />
          {review.product?._id && (
            <Link to={`/product/${review.product._id}`} className="lt-product" title={review.product.name}>
              {review.product.name}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ProductTestimonials() {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [active, setActive] = useState(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const railRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    reviewAPI.getFeatured({ limit: 12 })
      .then((d) => {
        if (cancelled) return;
        setReviews((d.reviews || []).filter((r) => r.product && (r.comment || r.title)));
        setSummary(d.summary || null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const updateEdges = () => {
    const el = railRef.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };
  useEffect(() => { updateEdges(); }, [reviews.length]);

  const slide = (dir) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 300), behavior: 'smooth' });
  };

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setActive(null); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [active]);

  if (!reviews.length) return null;
  const hasSamples = reviews.some((r) => r.isDemo);

  return (
    <section className="lt" aria-labelledby="lt-title">
      <div className="lt-wrap">
        <div className="lt-head">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="lt-eyebrow">Real words, real moments</span>
            <h2 id="lt-title">Loved by <em>you</em></h2>
          </motion.div>

          <div className="lt-head__side">
            {summary?.total > 0 && (
              <div className="lt-score">
                <strong>{summary.average.toFixed(1)}</strong>
                <div>
                  <Stars value={summary.average} size={15} />
                  <small>from {summary.total.toLocaleString('en-IN')} review{summary.total === 1 ? '' : 's'}</small>
                </div>
              </div>
            )}
            <div className="lt-arrows">
              <button type="button" onClick={() => slide(-1)} disabled={edge.start} aria-label="Previous reviews"><FiArrowLeft /></button>
              <button type="button" onClick={() => slide(1)} disabled={edge.end} aria-label="Next reviews"><FiArrowRight /></button>
            </div>
          </div>
        </div>

        <div className="lt-rail" ref={railRef} onScroll={updateEdges}>
          {reviews.map((r, i) => (
            <motion.div key={r._id} className="lt-cell"
              initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.55, delay: (i % 4) * 0.07 }}>
              {r.videos?.length ? <VideoCard review={r} onOpen={setActive} /> : <QuoteCard review={r} />}
            </motion.div>
          ))}
        </div>

      </div>

      <AnimatePresence>
        {active && (
          <motion.div className="lt-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActive(null)}>
            <motion.div className="lt-modal__card" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: 10 }}
              onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Video review by ${firstName(active)}`}>
              <button type="button" className="lt-modal__close" onClick={() => setActive(null)} aria-label="Close"><FiX /></button>
              <div className="lt-modal__video">
                <video src={active.videos[0]} controls autoPlay playsInline />
                <span className="lt-modal__sound"><FiVolume2 /> Sound on</span>
              </div>
              <div className="lt-modal__body">
                <Stars value={active.rating} size={16} />
                {active.title && <h3>{active.title}</h3>}
                {active.comment && <p>{active.comment}</p>}
                <Customer review={active} />
                {active.product?._id && (
                  <Link to={`/product/${active.product._id}`} className="lt-modal__shop" onClick={() => setActive(null)}>
                    {active.product.images?.[0] && <img src={active.product.images[0]} alt="" />}
                    <span><small>Featured piece</small><b>{active.product.name}</b></span>
                    <FiArrowRight />
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
