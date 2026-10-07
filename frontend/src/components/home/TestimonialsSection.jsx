import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import RatingStars from '../ui/RatingStars';
import SectionTitle from '../common/SectionTitle';

const testimonials = [
  { name: 'Priya Sharma', city: 'Mumbai', rating: 5, avatar: 'PS', color: 'bg-blue-500', text: 'Absolutely love growthkarts! The quality of clothes is amazing and they arrived within 2 days. The checkout experience with Razorpay was super smooth. Will definitely shop again!' },
  { name: 'Arjun Mehta', city: 'Delhi', rating: 5, avatar: 'AM', color: 'bg-blue-500', text: 'Best online clothing store I\'ve used. The size guide is spot on, no returns needed. The premium hoodie I ordered is incredibly soft and true to size. Highly recommend!' },
  { name: 'Kavya Nair', city: 'Bangalore', rating: 5, avatar: 'KN', color: 'bg-blue-500', text: 'The floral wrap dress I bought got so many compliments! Fast delivery, beautiful packaging, and the quality is better than expected. growthkarts is now my go-to fashion destination.' },
  { name: 'Rohit Kumar', city: 'Pune', rating: 4, avatar: 'RK', color: 'bg-green-500', text: 'Great value for money. The slim fit chinos fit perfectly and look very professional. The fit and finish are excellent, and customer service was genuinely helpful too.' },
];

function TestimonialCard({ t, i }) {
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const springCfg = { stiffness: 240, damping: 22, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [12, -12]), springCfg);
  const rotateY = useSpring(useTransform(px, [0, 1], [-12, 12]), springCfg);

  const handleMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };
  const handleLeave = () => { px.set(0.5); py.set(0.5); };

  return (
    <div ref={ref} style={{ perspective: 1000 }}>
      {/* entrance: flips in from the side in real 3D */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotateY: -35 }}
        whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
        viewport={{ once: true }}
        transition={{ delay: i * 0.1, duration: 0.6 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* idle: a slow, continuous 3D sway so the card stays visibly alive at rest */}
        <motion.div
          animate={{ rotateX: [0, 4, 0, -4, 0], rotateY: [0, -5, 0, 5, 0] }}
          transition={{ duration: 7 + i, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* hover: real cursor-tracked tilt overrides the idle sway */}
          <motion.div
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            whileHover={{ scale: 1.03 }}
            style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
            className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all will-change-transform"
          >
            <div className="flex items-center gap-3 mb-4" style={{ transform: 'translateZ(24px)' }}>
              <div className={`w-11 h-11 ${t.color} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>{t.avatar}</div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{t.name}</p>
                <p className="text-xs text-gray-400">{t.city}</p>
              </div>
            </div>
            <div style={{ transform: 'translateZ(16px)' }}>
              <RatingStars rating={t.rating} />
              <p className="text-gray-600 text-sm leading-relaxed mt-3 line-clamp-4">"{t.text}"</p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="py-8 md:py-10">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <SectionTitle eyebrow="Reviews" title="What Our Customers Say" className="mb-3" />
          <p className="text-gray-500">Join 50,000+ happy shoppers who love growthkarts</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <RatingStars rating={4.9} size="lg" />
            <span className="font-bold text-gray-800 text-lg">4.9</span>
            <span className="text-gray-400">from 12,000+ reviews</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" style={{ transformStyle: 'preserve-3d' }}>
          {testimonials.map((t, i) => (
            <TestimonialCard key={t.name} t={t} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}