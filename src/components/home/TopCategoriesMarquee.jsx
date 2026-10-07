import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProductForCollection, getProductImage, useHomeCategories, useHomeProducts } from '../../hooks/useHomeData';
import './TopCategoriesMarquee.css';

export default function TopCategoriesMarquee({ speed = 40 }) {
  const categories = useHomeCategories();
  const { products } = useHomeProducts(100);
  const items = categories.flatMap((category) => {
    const product = getProductForCollection(products, category);
    return product ? [{
      id: `${category.slug}-${category.sub}`,
      label: category.name,
      img: getProductImage(product),
      link: category.link,
      pos: 'center',
    }] : [];
  });

  if (items.length < 3) return null;

  // Repeat the list so one half always fills the screen, then double it for a seamless loop
  const base = [];
  while (base.length < 8) base.push(...items);
  const track = [...base, ...base];

  return (
    <section className="tcm">
      <motion.span className="tcm-eyebrow" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>Browse by type</motion.span>
      <motion.h2
        className="tcm-title"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
      >
        Top <em>Categories</em>
      </motion.h2>
      <motion.div
        className="tcm-line"
        initial={{ width: 0 }}
        whileInView={{ width: 70 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay: 0.3 }}
      />

      <div className="tcm-marquee" aria-label="Top categories">
        {/* right → left scrolling track, pauses on hover */}
        <div className="tcm-track" style={{ animationDuration: `${speed}s` }}>
          {track.map((c, i) => (
            <Link key={`${c.id}-${i}`} to={c.link} className="tcm-item" aria-hidden={i >= base.length ? 'true' : undefined} tabIndex={i >= base.length ? -1 : 0}>
              <span className="tcm-circle">
                <img src={c.img} alt={c.label} loading="lazy" style={{ objectPosition: c.pos }} />
                <span className="tcm-ring" />
              </span>
              <span className="tcm-label">{c.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}