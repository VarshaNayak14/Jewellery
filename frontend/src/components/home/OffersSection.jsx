import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';
import ScrollReveal3D from '../ui/ScrollReveal3D';
import { offerAPI } from '../../services/api';
import { getStoreUrl } from '../../utils/subdomain';
import { offerGradientStyle } from '../../utils/offerGradient';

// Hardcoded fallback — shown instantly on mount, kept until (and unless) the
// backend returns at least one Admin/SuperAdmin-approved seller offer. This
// guarantees the section is never empty or in a loading state.
const FALLBACK_OFFERS = [
  {
    key: 'fallback-fashion',
    tag: 'New Season',
    title: "Men's & Women's Fashion",
    desc: 'Trendy styles, fresh every week',
    discount: 'Up to 50% OFF',
    img: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=500&q=80',
    from: 'from-green-500',
    to: 'to-emerald-600',
    link: '/shop?sort=-createdAt',
  },
  {
    key: 'fallback-accessories',
    tag: 'Complete The Look',
    title: 'Accessories & Footwear',
    desc: 'Bags, watches, shoes & more',
    discount: 'Up to 40% OFF',
    img: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=500&q=80',
    from: 'from-orange-500',
    to: 'to-amber-600',
    link: '/shop?category=accessories',
  },
  {
    key: 'fallback-discount',
    tag: 'Limited Time',
    title: 'Get 20% Off',
    desc: 'On first order above ₹2000 • Code: LUXE20',
    discount: null,
    img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&q=80',
    from: 'from-blue-600',
    to: 'to-blue-700',
    link: '/shop',
  },
];

// Approved seller offers come back with different field names than the
// hardcoded fallback — normalize to the shape OfferCard expects.
function mapApiOffer(offer) {
  return {
    key: offer._id,
    tag: offer.tag,
    title: offer.title,
    desc: offer.description,
    discount: offer.discountText,
    img: offer.image,
    from: offer.colorFrom,
    to: offer.colorTo,
    link: offer.link || (offer.seller?.shopSlug ? getStoreUrl(offer.seller.shopSlug) : '/'),
    external: Boolean(offer.link?.startsWith('http') || offer.seller?.shopSlug),
  };
}

function OfferCard({ offer }) {
  return (
    <div style={{ perspective: 1000 }}>
      <motion.div
        whileHover={{ y: -4, scale: 1.015 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={offerGradientStyle(offer.from, offer.to)}
        className={`relative overflow-hidden rounded-3xl p-4 sm:p-6 min-h-[190px] sm:min-h-0 sm:h-[230px] flex items-center justify-between gap-3 will-change-transform shadow-lg hover:shadow-xl`}
      >
        <div className="z-10 flex-1 min-w-0">
          <p className="text-white/85 font-semibold mb-1 sm:mb-1.5 text-[10px] sm:text-xs uppercase tracking-wide">{offer.tag}</p>
          <h2 className="font-display text-lg sm:text-xl font-bold text-white mb-1 sm:mb-1.5 leading-tight line-clamp-2">{offer.title}</h2>
          <p className="text-white/80 mb-2 text-[11px] sm:text-xs line-clamp-2">{offer.desc}</p>
          {offer.discount && <p className="text-yellow-300 font-extrabold text-base sm:text-lg mb-2 sm:mb-3">{offer.discount}</p>}
          {offer.external ? (
            <a href={offer.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-white text-gray-900 font-bold py-1.5 px-4 sm:py-2 sm:px-5 rounded-xl hover:bg-gray-100 transition-all shadow-lg text-xs sm:text-sm whitespace-nowrap">
              Shop Now <FiArrowRight />
            </a>
          ) : (
            <Link to={offer.link || '/'} className="inline-flex items-center gap-1.5 bg-white text-gray-900 font-bold py-1.5 px-4 sm:py-2 sm:px-5 rounded-xl hover:bg-gray-100 transition-all shadow-lg text-xs sm:text-sm whitespace-nowrap">
              Shop Now <FiArrowRight />
            </Link>
          )}
        </div>
        <img src={offer.img} alt={offer.title}
          className="z-10 w-20 h-20 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-xl border-2 border-white/30 flex-shrink-0" />
      </motion.div>
    </div>
  );
}

// One auto-scrolling row of the marquee (used when there are > 6 offers).
// The row's items are duplicated once so the CSS translateX loop from 0% to
// -50% (or the reverse) is seamless. Hovering pauses the animation so cards
// stay comfortably clickable/readable.
function MarqueeRow({ items, keyframe }) {
  const [paused, setPaused] = useState(false);
  const duration = Math.max(items.length * 6, 24);

  return (
    <div
      className="overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex gap-6 w-max"
        style={{
          animation: `${keyframe} ${duration}s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      >
        {[...items, ...items].map((offer, i) => (
          <div key={`${offer.key}-${i}`} className="flex-shrink-0 w-[280px] sm:w-[340px]">
            <OfferCard offer={offer} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OffersSection({ sellerId }) {
  const [offers, setOffers] = useState(sellerId ? [] : FALLBACK_OFFERS);

  useEffect(() => {
    let cancelled = false;
    const request = sellerId ? offerAPI.getBySeller(sellerId) : offerAPI.getApproved();
    request
      .then((data) => {
        if (cancelled) return;
        const fetched = data?.offers;
        if (Array.isArray(fetched)) setOffers(fetched.map(mapApiOffer));
      })
      .catch(() => {
        // Keep the marketplace fallback or an empty seller storefront section.
      });
    return () => { cancelled = true; };
  }, [sellerId]);

  if (offers.length === 0) return null;

  const count = offers.length;
  const isMarquee = count > 6;

  return (
    <section className="py-8 md:py-10">
      <div className="max-w-7xl mx-auto px-4">
        {isMarquee ? (
          <>
            <style>{`
              @keyframes offersMarqueeLeft { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
              @keyframes offersMarqueeRight { 0% { transform: translateX(-50%); } 100% { transform: translateX(0%); } }
            `}</style>
            <div className="space-y-6">
              <MarqueeRow items={offers.slice(0, Math.ceil(count / 2))} keyframe="offersMarqueeLeft" />
              <MarqueeRow items={offers.slice(Math.ceil(count / 2))} keyframe="offersMarqueeRight" />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {offers.map((offer, i) => (
              <ScrollReveal3D key={offer.key} axis={i % 2 === 0 ? 'x' : 'y'} angle={26} distance={35}>
                <OfferCard offer={offer} />
              </ScrollReveal3D>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
