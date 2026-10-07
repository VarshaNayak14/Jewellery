import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiChevronRight } from 'react-icons/fi';
import { getProductForCollection, getProductImage, useHomeCategories, useHomeProducts } from '../../hooks/useHomeData';
import './CuratedCollections.css';

const ease = [0.2, 0.7, 0.2, 1];

// "Shop by categories" grid: 2 big cards on top, 4 smaller cards below.
// Everything (names, photos, links) comes from the live categories / subcategories.
export default function CuratedCollections() {
  const categories = useHomeCategories(); // already in display order
  const { products } = useHomeProducts(100);
  const items = useMemo(() => categories.slice(0, 6).flatMap((category) => {
    const product = getProductForCollection(products, category);
    return product ? [{ ...category, image: getProductImage(product) }] : [];
  }), [categories, products]);

  if (items.length < 2) return null;

  return (
    <section className="cc">
      <div className="cc-wrap">
        <div className="cc-head">
          <motion.span className="cc-eyebrow" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>Shop by categories</motion.span>
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }}>
            Our <em>Collections</em>
          </motion.h2>
          <motion.div className="cc-line" initial={{ width: 0 }} whileInView={{ width: 70 }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.3 }} />
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2, ease }}>
            Find your perfect sparkle across every category.
          </motion.p>
        </div>

        <div className="cc-grid">
          {items.map((it, i) => (
            <motion.div
              key={`${it.slug}-${it.sub}`}
              className={`cc-cell ${i < 2 ? 'cc-big' : 'cc-small'}`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.75, delay: (i % 4) * 0.08, ease }}
            >
              <Link to={it.link} className="cc-card" aria-label={`Explore ${it.name}`}>
                <img src={it.image} alt={it.name} loading="lazy" />
                <span className="cc-label">
                  <strong>{it.name}</strong>
                  <i>Explore <FiChevronRight aria-hidden="true" /></i>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}