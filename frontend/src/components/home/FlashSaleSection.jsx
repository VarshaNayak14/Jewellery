import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiZap, FiArrowRight } from 'react-icons/fi';
import { productAPI } from '../../services/api';
import ProductCard from '../product/ProductCard';
import { ProductCardSkeleton } from '../ui/Skeleton';
import { getSavedLocation, onLocationChange } from '../../utils/location';
import { useTheme } from '../../context/ThemeContext';
import SectionTitle from '../common/SectionTitle';

// real 3D flip — each digit rotates around the X axis like a mechanical flip clock
const CountdownUnit = ({ value, label }) => {
  const display = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      <div style={{ perspective: 300 }} className="relative w-14 md:w-16 h-14 md:h-16">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={display}
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: 90, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformStyle: 'preserve-3d' }}
            className="absolute inset-0 bg-white text-blue-600 font-bold text-2xl md:text-3xl rounded-md flex items-center justify-center shadow-lg tabular-nums"
          >
            {display}
          </motion.div>
        </AnimatePresence>
      </div>
      <span className="text-gray-600 dark:text-white/80 text-xs mt-1">{label}</span>
    </div>
  );
};

export default function FlashSaleSection() {
  const { isDark } = useTheme();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 5, minutes: 23, seconds: 59 });
  const [location, setLocation] = useState(() => getSavedLocation());

  useEffect(() => onLocationChange(setLocation), []);

  useEffect(() => {
    setLoading(true);
    productAPI.getFlashSale({
      state: location?.state || '',
      district: location?.district || '',
      tehsil: location?.tehsil || '',
    })
      .then(data => setProducts(data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [location]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        if (seconds > 0) return { ...prev, seconds: seconds - 1 };
        if (minutes > 0) return { hours, minutes: minutes - 1, seconds: 59 };
        if (hours > 0) return { hours: hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-16 bg-gradient-to-br from-orange-50 via-white to-blue-50 dark:from-[#0b1224] dark:via-[#111a33] dark:to-[#0b1224] relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="max-w-7xl mx-auto px-4 relative">
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-3 mb-2">
              <FiZap className="w-6 h-6 text-amber-600 dark:text-yellow-300 fill-current" />
              <span className="text-amber-600 dark:text-yellow-300 font-bold uppercase tracking-widest text-sm">Flash Sale</span>
            </div>
            <SectionTitle title="Deals End In" />
          </motion.div>

          <div className="flex items-center gap-3">
            <CountdownUnit value={timeLeft.hours} label="Hours" />
            <span className="text-gray-900 dark:text-white text-3xl font-bold mb-4">:</span>
            <CountdownUnit value={timeLeft.minutes} label="Minutes" />
            <span className="text-gray-900 dark:text-white text-3xl font-bold mb-4">:</span>
            <CountdownUnit value={timeLeft.seconds} label="Seconds" />
          </div>

          <Link to="/shop?isFlashSale=true"
            className="flex items-center gap-2 bg-white text-blue-600 font-bold py-3 px-6 rounded-2xl hover:bg-gray-100 transition-all shadow-lg">
            View All <FiArrowRight />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 16 }).map((_, i) => <ProductCardSkeleton key={i} dark={isDark} />)
          ) : (
            products.slice(0, 16).map((product, i) => (
              <div key={product._id} style={{ perspective: 900 }}>
                <motion.div initial={{ opacity: 0, y: 36, scale: 0.94, rotateY: -40 }} whileInView={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }} style={{ transformStyle: 'preserve-3d' }}>
                  <ProductCard product={product} dark={isDark} index={i} />
                </motion.div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}