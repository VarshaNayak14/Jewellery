import { useState, useEffect } from 'react';
import CircularGallery from './CircularGallery';
import ScrollReveal3D from '../ui/ScrollReveal3D';
import { useTheme } from '../../context/ThemeContext';
import { settingsAPI } from '../../services/api';
import SectionTitle from '../common/SectionTitle';

const defaultTitle = 'Drag Through Our World';
const defaultSubtitle = 'Scroll, drag, or use the arrow keys — everything bends in 3D.';

const defaultItems = [
  { image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=900&q=80', text: "Men's Fashion" },
  { image: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=900&q=80', text: "Women's Fashion" },
  { image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=900&q=80', text: 'Kids Fashion' },
  { image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=900&q=80', text: 'Accessories' },
  { image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900&q=80', text: 'Footwear' },
  { image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&q=80', text: 'Ethnic Wear' },
  { image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&q=80', text: 'Electronics' },
  { image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=80', text: 'Home & Lifestyle' },
];

// A WebGL "wall" of category art that bends and scrolls in 3D as you drag or
// scroll it — a showpiece section, separate from the functional category grid.
export default function CircularShowcase() {
  const { isDark } = useTheme();
  const [title, setTitle] = useState(defaultTitle);
  const [subtitle, setSubtitle] = useState(defaultSubtitle);
  const [items, setItems] = useState(defaultItems);

  // Load admin-editable content (Admin → Settings → Homepage). Keeps the
  // hardcoded defaults if the request fails or the field is missing/empty
  // (older cached settings doc) so the gallery never renders empty.
  useEffect(() => {
    settingsAPI.getPublic()
      .then(d => {
        const section = d.settings?.homepageSections?.circularShowcase;
        if (!section) return;
        if (section.title) setTitle(section.title);
        if (section.subtitle) setSubtitle(section.subtitle);
        if (Array.isArray(section.items) && section.items.length > 0) setItems(section.items);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="py-10 md:py-14 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <ScrollReveal3D className="text-center mb-6">
          <span className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-5 border border-amber-200 dark:border-amber-400/20">
            Explore
          </span>
          <SectionTitle title={title} className="mb-2" />
          <p className="text-gray-600 dark:text-gray-400 text-sm max-w-lg mx-auto">
            {subtitle}
          </p>
        </ScrollReveal3D>
      </div>

      <div style={{ height: '520px', position: 'relative' }}>
        <CircularGallery
          items={items}
          bend={2.5}
          textColor={isDark ? '#ffffff' : '#111827'}
          borderRadius={0.06}
          scrollEase={0.06}
          font="bold 26px Figtree"
          scrollSpeed={2}
        />
      </div>
    </section>
  );
}