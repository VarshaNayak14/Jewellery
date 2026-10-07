import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FiArrowLeft, FiArrowRight, FiPhone, FiMapPin, FiStar, FiCheckCircle, FiShoppingBag } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { businessAPI } from '../../services/api';
import { getSavedLocation, onLocationChange } from '../../utils/location';
import { toWhatsappNumber } from '../../utils/helpers';
import { getStoreUrl } from '../../utils/subdomain';
import './StoreLocator.css';

// Shown only until real sellers reach the shopper's location.
// SAMPLE DATA — replace phone / images, or just let real sellers load from the API.
const SAMPLE = [
  { shopName: 'Aurum Jewellers', city: 'Indore', state: 'Madhya Pradesh', address: 'MG Road, Indore', phone: '9876500001', avgRating: 4.8, numRatings: 214, isVerified: true, img: '/jewelry/hero-gold.jpg', pos: 'center 40%' },
  { shopName: 'Royal Gold House', city: 'Bhopal', state: 'Madhya Pradesh', address: 'New Market, TT Nagar, Bhopal', phone: '9876500002', avgRating: 4.7, numRatings: 168, isVerified: true, img: '/jewelry/campaign.jpg', pos: 'center 50%' },
  { shopName: 'Heritage Gems', city: 'Jaipur', state: 'Rajasthan', address: 'Johari Bazaar, Jaipur', phone: '9876500003', avgRating: 4.9, numRatings: 302, isVerified: true, img: '/jewelry/necklace.jpg', pos: 'center 45%' },
  { shopName: 'Silver Leaf Studio', city: 'Mumbai', state: 'Maharashtra', address: 'Opera House, Mumbai', phone: '9876500004', avgRating: 4.6, numRatings: 97, isVerified: false, img: '/jewelry/earrings.jpg', pos: 'center 60%' },
  { shopName: 'Diamond Dreams', city: 'New Delhi', state: 'Delhi', address: 'Connaught Place, New Delhi', phone: '9876500005', avgRating: 4.8, numRatings: 143, isVerified: true, img: '/jewelry/ring.jpg', pos: 'center 50%' },
  { shopName: 'Gold Detail Co.', city: 'Ahmedabad', state: 'Gujarat', address: 'CG Road, Ahmedabad', phone: '9876500006', avgRating: 4.7, numRatings: 121, isVerified: false, img: '/jewelry/gold-detail.jpg', pos: 'center 55%' },
];

const ease = [0.2, 0.7, 0.2, 1];

// Normalises a real seller (API) or a sample into what the card needs.
function toCard(s, sample) {
  const banner = s.bannerType !== 'video' && s.banner;
  const logo = s.logo || s.lightLogo || s.darkLogo;
  return {
    key: s.shopSlug || s.shopName,
    name: s.shopName,
    place: [s.city || s.district, s.state].filter(Boolean).join(', '),
    address: s.address,
    phone: s.phone,
    whatsapp: s.whatsapp || s.phone,
    rating: Number(s.avgRating || 0),
    ratings: s.numRatings || 0,
    verified: !!s.isVerified,
    img: sample ? s.img : (banner || logo || '/jewelry/hero-gold.jpg'),
    contain: !sample && !banner && !!logo,
    pos: s.pos || 'center',
    storeUrl: sample ? '/nearby' : getStoreUrl(s.shopSlug),
    external: !sample,
  };
}

function CardMedia({ c }) {
  return (
    <>
      <img src={c.img} alt={c.name} loading="lazy" style={{ objectPosition: c.pos }} />
      <span className="bs-badge"><FiStar /> Best Seller</span>
      <div className="bs-over">
        <h3>{c.name}{c.verified && <FiCheckCircle className="bs-verified" title="Verified" />}</h3>
        <p className="bs-place"><FiMapPin />{c.place || c.address}</p>
      </div>
    </>
  );
}

export default function BestSellers() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [sellers, setSellers] = useState(null);
  const [location, setLocation] = useState(() => getSavedLocation());
  useEffect(() => onLocationChange(setLocation), []);

  // Most popular sellers that reach the shopper's location (same rule as the rest of the site)
  useEffect(() => {
    businessAPI.search({
      sort: 'popular', limit: 10,
      state: location?.state || undefined,
      district: location?.district || undefined,
      tehsil: location?.tehsil || undefined,
    })
      .then((d) => setSellers((d.data || []).filter((s) => s.shopSlug)))
      .catch(() => setSellers([]));
  }, [location]);

  const cards = sellers && sellers.length > 0 ? sellers.map((s) => toCard(s, false)) : SAMPLE.map((s) => toCard(s, true));

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [updateEdges, cards.length]);

  const slide = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('.bs-card');
    el.scrollBy({ left: dir * ((card?.offsetWidth || 320) + 24), behavior: 'smooth' });
  };

  return (
    <section className="bs" ref={sectionRef}>
      <motion.img className="bs-bg" src="/jewelry/campaign.jpg" alt="" aria-hidden="true" loading="lazy" style={{ y: bgY }} />
      <div className="bs-shade" />

      <div className="bs-wrap">
        <div className="bs-head">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}>
            <span className="bs-eyebrow">Top rated stores</span>
            <h2>Best <em>Sellers</em></h2>
          </motion.div>
          <div className="bs-controls">
            <button type="button" className="bs-arrow" onClick={() => slide(-1)} disabled={edge.start} aria-label="Previous"><FiArrowLeft /></button>
            <button type="button" className="bs-arrow" onClick={() => slide(1)} disabled={edge.end} aria-label="Next"><FiArrowRight /></button>
            <Link to="/nearby" className="bs-all">View all</Link>
          </div>
        </div>

        <div className="bs-track" ref={trackRef} onScroll={updateEdges}>
          {cards.map((c, i) => (
            <motion.article
              key={c.key}
              className="bs-card"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.7, delay: Math.min(i, 5) * 0.08, ease }}
            >
              {c.external ? (
                <a href={c.storeUrl} target="_blank" rel="noreferrer" className={`bs-img ${c.contain ? 'is-logo' : ''}`}>
                  <CardMedia c={c} />
                </a>
              ) : (
                <Link to={c.storeUrl} className={`bs-img ${c.contain ? 'is-logo' : ''}`}>
                  <CardMedia c={c} />
                </Link>
              )}

              <div className="bs-body">
                <p className="bs-rating">
                  <FiStar />{c.ratings > 0 ? <><b>{c.rating.toFixed(1)}</b><span>· {c.ratings} reviews</span></> : <span>New on the platform</span>}
                </p>
                <div className="bs-actions">
                  {c.external
                    ? <a className="bs-view" href={c.storeUrl} target="_blank" rel="noreferrer">Visit store <FiArrowRight /></a>
                    : <Link className="bs-view" to={c.storeUrl}>Visit store <FiArrowRight /></Link>}
                  <a className="bs-icon bs-wa" title="WhatsApp" aria-label={`WhatsApp ${c.name}`}
                    href={`https://wa.me/${toWhatsappNumber(c.whatsapp)}?text=${encodeURIComponent(`Hi, I found "${c.name}" online and I'm interested in your jewellery.`)}`}
                    target="_blank" rel="noreferrer"><FaWhatsapp /></a>
                  <a className="bs-icon" title="Call" aria-label={`Call ${c.name}`} href={`tel:${c.phone}`}><FiPhone /></a>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}