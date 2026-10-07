import { useRef } from 'react';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiAward } from 'react-icons/fi';

const brands = [
  { name: 'Nike', logo:'/adidas.jpg' },
  { name: 'Adidas', logo: '/amozon.webp' },
  { name: 'Levi\'s', logo: '/filipcard.png' },
  { name: 'Zara', logo: '/myntra.png'},
  { name: 'H&M', logo: '/nike.png' },
  { name: 'Mango', logo: '/zara.jpg'},
];

export default function BrandShowcase() {
  const brandsRef = useRef(null);

  const scrollBrands = (direction) => {
    brandsRef.current?.scrollBy({ left: direction * 260, behavior: 'smooth' });
  };

  return (
    <section className="py-16 bg-violet-50/70 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex items-center gap-2 text-violet-600 font-semibold text-sm uppercase tracking-widest mb-2">
              <FiAward className="w-5 h-5" /> Original Brands
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="font-display text-3xl md:text-4xl font-bold text-gray-900">
              Shop trusted names
            </motion.h2>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button type="button" aria-label="Previous brands" onClick={() => scrollBrands(-1)} className="w-10 h-10 rounded-full bg-white border border-violet-100 text-violet-600 shadow-sm hover:bg-violet-600 hover:text-white transition-colors">
              <FiChevronLeft className="mx-auto" />
            </button>
            <button type="button" aria-label="Next brands" onClick={() => scrollBrands(1)} className="w-10 h-10 rounded-full bg-white border border-violet-100 text-violet-600 shadow-sm hover:bg-violet-600 hover:text-white transition-colors">
              <FiChevronRight className="mx-auto" />
            </button>
          </div>
        </div>

        <div ref={brandsRef} className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-3 no-scrollbar">
          {brands.map((brand, i) => (
            <motion.div
              key={brand.name}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="group flex-shrink-0 snap-start w-44 sm:w-52 rounded-2xl bg-white p-5 shadow-sm border border-violet-100 cursor-pointer"
            >
              <div className="h-24 flex items-center justify-center rounded-xl bg-violet-50/70 mb-4 overflow-hidden">
                <img src={brand.logo} alt={brand.name} className="max-h-16 max-w-[80%] object-contain grayscale group-hover:grayscale-0 transition-all duration-300 opacity-60 group-hover:opacity-100 group-hover:scale-110" />
              </div>
              <p className="text-center text-sm font-semibold text-gray-700 group-hover:text-violet-600 transition-colors">{brand.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
