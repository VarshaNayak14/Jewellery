import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';
import { productAPI } from '../../services/api';
import ProductCard from '../product/ProductCard';
import { ProductCardSkeleton } from '../ui/Skeleton';
import ScrollReveal3D from '../ui/ScrollReveal3D';
import { getSavedLocation, onLocationChange } from '../../utils/location';
import { useTheme } from '../../context/ThemeContext';
import SectionTitle from '../common/SectionTitle';

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96, rotateY: -40 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    rotateY: 0,
    transition: { delay: index * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function ProductSection({ title, subtitle, params = {}, link = '/shop', limit = 8 }) {
  const { isDark } = useTheme();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(() => getSavedLocation());

  useEffect(() => onLocationChange(setLocation), []);

  useEffect(() => {
    setLoading(true);
    productAPI.getAll({
      ...params, limit,
      state: location?.state || '',
      district: location?.district || '',
      tehsil: location?.tehsil || '',
    })
      .then(data => setProducts(data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [location]);

  return (
    <section className="py-8 md:py-10">
      <div className="max-w-7xl mx-auto px-4">
        <ScrollReveal3D className="mb-10" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <SectionTitle title={title} className="mb-2" />
            <motion.div initial={{ width: 0 }} whileInView={{ width: 72 }} viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.5 }} className="h-1 rounded-full bg-blue-500 mb-3" />
            {subtitle && <p className="text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
          <Link to={link} className="hidden md:flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:gap-3 transition-all">
            View All <FiArrowRight />
          </Link>
        </ScrollReveal3D>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {loading ? (
            Array.from({ length: limit }).map((_, i) => <ProductCardSkeleton key={i} dark={isDark} />)
          ) : (
            products.map((product, i) => (
              <div key={product._id} style={{ perspective: 900 }}>
                <motion.div custom={i} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} style={{ transformStyle: 'preserve-3d' }}>
                  <ProductCard product={product} dark={isDark} index={i} />
                </motion.div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link to={link} className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold border border-blue-400/30 rounded-xl px-6 py-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all">
            View All <FiArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}