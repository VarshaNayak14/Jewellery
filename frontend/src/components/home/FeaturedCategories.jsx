import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ScrollReveal3D from '../ui/ScrollReveal3D';
import AccordionGallery from './AccordionGallery';
import { categoryAPI } from '../../services/api';
import SectionTitle from '../common/SectionTitle';

// Evergreen promo tile appended after the dynamic categories — not a real
// category, just a permanent shortcut to flash-sale items.
const FLASH_SALE_TILE = {
  id: 'flash-sale',
  label: 'Flash Sale',
  img: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=500&q=80',
  link: '/shop?isFlashSale=true',
  highlight: true,
};

export default function FeaturedCategories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    categoryAPI.getAll()
      .then(data => {
        // Only categories Admin/Super Admin has both marked "On Homepage"
        // AND given an image — see AdminCategories.jsx.
        const dynamic = (data.categories || [])
          .filter(c => c.isActive && c.showOnHomepage !== false && c.image)
          .map(c => ({ id: c.slug, label: c.name, img: c.image, link: `/shop/${c.slug}` }));
        setCategories([...dynamic, FLASH_SALE_TILE]);
      })
      .catch(() => setCategories([FLASH_SALE_TILE]));
  }, []);

  // Only the evergreen promo tile (or nothing yet) — no real categories to show.
  if (categories.length <= 1) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="max-w-7xl mx-auto px-4">
        <ScrollReveal3D className="text-center mb-10">
          <SectionTitle eyebrow="Explore" title="Shop by Category" className="mb-3" />
          <motion.div
            className="h-0.5 bg-amber-500 mx-auto"
            initial={{ width: 0 }}
            whileInView={{ width: 64 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          />
        </ScrollReveal3D>

        <div className="hidden md:block">
          <AccordionGallery
            items={categories.map((cat) => ({
              image: cat.img,
              label: cat.label,
              link: cat.link,
            }))}
            defaultIndex={0}
            expandRatio={0.5}
            trigger="hover"
            accentColor="#f59e0b"
            overlayColor="#05070f"
            textColor="#ffffff"
            grayscale
            showLabels
            duration={0.6}
            ease="power3.out"
            parallax={0.4}
            tilt={6}
            stagger={0.06}
            height={420}
            gap={10}
            radius={20}
            orientation="horizontal"
          />
        </div>

        {/* Simple scrollable row on mobile — the accordion needs pointer hover to make sense */}
        <div className="md:hidden overflow-x-auto no-scrollbar -mx-4 px-4">
          <div className="flex gap-4 w-max">
            {categories.map((cat, i) => (
              <motion.a
                key={cat.id}
                href={cat.link}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.05 }}
                className="relative w-[160px] h-[200px] flex-shrink-0 rounded-2xl overflow-hidden shadow-md"
              >
                <img src={cat.img} alt={cat.label} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <p className="absolute bottom-3 left-3 right-3 font-bold text-sm text-white">{cat.label}</p>
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}