import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import Tilt3D from '../ui/Tilt3D';
import ScrollReveal3D from '../ui/ScrollReveal3D';
import { settingsAPI } from '../../services/api';
import SectionTitle from '../common/SectionTitle';

const defaultTitle = 'Most Recommended Collections For You';
const defaultSubtitle = 'Discover fashion, tech, home essentials and more from trusted sellers in one marketplace.';

const defaultCollections = [
  {
    label: 'Fashion & Footwear',
    cta: 'Explore fashion',
    link: '/shop',
    img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&q=85',
    big: true,
  },
  {
    label: 'Tech & Gadgets',
    cta: 'Shop electronics',
    link: '/shop',
    img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=700&q=85',
  },
  {
    label: 'Home & Lifestyle',
    cta: 'Explore more',
    link: '/shop',
    img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&q=85',
  },
];

function CollectionTile({ c, className = '', axis = 'x', idleDuration = 7 }) {
  return (
    <ScrollReveal3D className={className} axis={axis} angle={20} distance={40}>
      <Tilt3D max={6} scale={1.015} lift={12} idle idleAmount={2.5} idleDuration={idleDuration} className="rounded-2xl h-full">
        <Link to={c.link} className="group relative block h-full overflow-hidden rounded-2xl shadow-md">
          <img
            src={c.img}
            alt={c.label}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" style={{ transform: 'translateZ(1px)' }} />
          <div className="absolute bottom-5 left-5 right-5" style={{ transform: 'translateZ(20px)' }}>
            <p className="text-white font-display text-xl md:text-2xl font-bold mb-3">{c.label}</p>
            <span className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg shadow-blue-600/25 group-hover:bg-blue-700 group-hover:gap-3 transition-all">
              {c.cta} <FiArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>
      </Tilt3D>
    </ScrollReveal3D>
  );
}

export default function RecommendedCollections() {
  const [title, setTitle] = useState(defaultTitle);
  const [subtitle, setSubtitle] = useState(defaultSubtitle);
  const [collections, setCollections] = useState(defaultCollections);
  const [badge, setBadge] = useState('Shop Now');
  // Nothing is drawn until settings arrive, so a section switched off in
  // Admin Settings never flashes on screen first.
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(true);

  // Load admin-editable content (Admin → Settings → Homepage). Keeps the
  // hardcoded defaults on screen if the request fails, the field is missing
  // (older cached settings doc), or doesn't have exactly the 3 items this
  // grid layout depends on — so the section never breaks or looks empty.
  useEffect(() => {
    settingsAPI.getPublic()
      .then(d => {
        const section = d.settings?.homepageSections?.recommendedCollections;
        if (!section) return;
        if (section.enabled === false) setEnabled(false);
        if (section.badge !== undefined) setBadge(section.badge);
        if (section.title) setTitle(section.title);
        if (section.subtitle) setSubtitle(section.subtitle);
        if (Array.isArray(section.items) && section.items.length === 3) setCollections(section.items);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready || !enabled) return null;

  return (
    <section className="py-14 md:py-20">
      <div className="max-w-7xl mx-auto px-4">
        <ScrollReveal3D className="text-center mb-10">
          {badge && (
            <span className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-5 border border-blue-200 dark:border-blue-400/20 animate-card-glow">
              {badge}
            </span>
          )}
          <SectionTitle title={title} className="mb-3" />
          <p className="text-gray-600 dark:text-gray-400 text-sm max-w-lg mx-auto">
            {subtitle}
          </p>
        </ScrollReveal3D>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:grid-rows-2" style={{ gridAutoRows: '1fr' }}>
          <CollectionTile c={collections[0]} className="min-h-[300px] md:min-h-0 md:row-span-2" axis="y" idleDuration={8} />
          <CollectionTile c={collections[1]} className="min-h-[190px]" axis="x" idleDuration={6} />
          <CollectionTile c={collections[2]} className="min-h-[190px]" axis="x" idleDuration={7} />
        </div>
      </div>
    </section>
  );
}