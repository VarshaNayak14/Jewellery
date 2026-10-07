import { useState, useEffect } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
};
import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import DepthCarousel from './DepthCarousel';
import ScrollReveal3D from '../ui/ScrollReveal3D';
import { settingsAPI, businessAPI } from '../../services/api';
import { getSavedLocation, onLocationChange } from '../../utils/location';
import { getStoreUrl } from '../../utils/subdomain';
import SectionTitle from '../common/SectionTitle';

const defaultTitle = 'Most Popular Sellers';
const defaultSubtitle = 'The local shops our customers love most — top rated and trusted. Drag, scroll, or use the arrow keys to flip through them, and tap the front card to visit the store.';
// Section copy saved before this section showed sellers — treated as unset.
const OLD_TITLE = "This Week's Most-Loved Picks";

// Shown only when no seller reaches the shopper's location yet.
const defaultItems = [
  { image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=700&q=80', alt: 'Sneakers' },
  { image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&q=80', alt: 'Watch' },
  { image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&q=80', alt: 'Sunglasses' },
  { image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=700&q=80', alt: 'Handbag' },
];

// A seller as a carousel card: their image banner if they have one,
// otherwise their logo on white, with name + rating + city as the caption.
const sellerCard = (s) => {
  const banner = s.bannerType !== 'video' && s.banner;
  const logo = s.logo || s.lightLogo || s.darkLogo;
  const rating = s.numRatings > 0 ? `★ ${Number(s.avgRating || 0).toFixed(1)} (${s.numRatings})` : 'New on growthkarts';
  return {
    image: banner || logo || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=700&q=80',
    fit: !banner && logo ? 'contain' : 'cover',
    alt: s.shopName,
    title: s.shopName,
    subtitle: [rating, s.city || s.district].filter(Boolean).join(' · '),
    slug: s.shopSlug,
  };
};

// A drag/scroll/keyboard-driven 3D depth-stack of the most popular sellers
// that reach the shopper's location, paired with copy on the right.
export default function DepthShowcase() {
  const [title, setTitle] = useState(defaultTitle);
  const [subtitle, setSubtitle] = useState(defaultSubtitle);
  const [fallbackItems, setFallbackItems] = useState(defaultItems);
  const [sellers, setSellers] = useState(null);
  const [location, setLocation] = useState(() => getSavedLocation());
  const isMobile = useIsMobile();

  useEffect(() => onLocationChange(setLocation), []);

  // Heading text stays editable from Admin → Settings → Homepage.
  useEffect(() => {
    settingsAPI.getPublic()
      .then(d => {
        const section = d.settings?.homepageSections?.depthShowcase;
        if (!section) return;
        if (section.title && section.title !== OLD_TITLE) {
          setTitle(section.title);
          if (section.subtitle) setSubtitle(section.subtitle);
        }
        if (Array.isArray(section.items) && section.items.length > 0) setFallbackItems(section.items);
      })
      .catch(() => {});
  }, []);

  // Most popular sellers — same plan-reach rule as every other listing.
  useEffect(() => {
    businessAPI.search({
      sort: 'popular',
      limit: 8,
      state: location?.state || undefined,
      district: location?.district || undefined,
      tehsil: location?.tehsil || undefined,
    })
      .then(d => setSellers((d.data || []).filter(s => s.shopSlug)))
      .catch(() => setSellers([]));
  }, [location]);

  const showingSellers = sellers?.length > 0;
  const items = showingSellers ? sellers.map(sellerCard) : fallbackItems;
  const openStore = (item) => {
    if (item?.slug) window.open(getStoreUrl(item.slug), '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="py-8 md:py-14">
      <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 items-center gap-4 md:gap-8">
        {/* Phones: a shorter stage and bigger cards, so the stack fills the width */}
        <div style={{ height: isMobile ? '400px' : '500px', position: 'relative' }}>
          <DepthCarousel
            key={`${showingSellers ? 'sellers' : 'fallback'}-${isMobile ? 'm' : 'd'}`}
            sidePadding={isMobile ? 16 : 120}
            items={items}
            onOpen={showingSellers ? openStore : undefined}
            depth={200}
            spread={isMobile ? 36 : 80}
            tilt={22}
            tiltDirection="right"
            perspective={1400}
            visibleCards={4}
            falloff={0.2}
            blur={6}
            autoplay
            loop
            cardWidth={isMobile ? 250 : 280}
            cardHeight={isMobile ? 330 : 360}
            radius={18}
            tint="#05070f"
            duration={700}
            ease="power3.out"
            autoplayDelay={3200}
            showControls
            showIndicators
          />
        </div>

        <ScrollReveal3D axis="y">
          <span className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 md:mb-5 border border-blue-200 dark:border-blue-400/20">
            Popular Sellers
          </span>
          <SectionTitle title={title} className="mb-3" />
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base mb-5 md:mb-6 max-w-md">
            {subtitle}
          </p>
          <ul className="space-y-2.5 mb-6 md:mb-7 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Ranked by real customer ratings</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Trusted local businesses near you</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Visit their store in one tap</li>
          </ul>
          <Link to="/nearby" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/25">
            View All Sellers <FiArrowRight />
          </Link>
        </ScrollReveal3D>
      </div>
    </section>
  );
}