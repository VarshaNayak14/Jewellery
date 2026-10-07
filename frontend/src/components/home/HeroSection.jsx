import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { FiArrowUpRight } from 'react-icons/fi';
import Hero3DScene from './Hero3DScene';

// One slide per category — this rotates automatically since growthkarts
// is a multi-vendor marketplace, not a single-niche store.
const slides = [
  {
    badge: 'Fashion',
    title: 'Grab Upto 50% Off On',
    highlight: 'Selected Styles',
    img: '/jacket.png',
    cta: '/shop',
  },
  {
    badge: 'Electronics',
    title: 'Grab Upto 50% Off On',
    highlight: 'Selected Headphones',
    img: '/headphone.png',
    cta: '/shop?category=electronics',
  },
  {
    badge: 'Footwear',
    title: 'Step Into 40% Off On',
    highlight: 'Trending Sneakers',
    img: '/footware.png',
    cta: '/shop',
  },
  {
    badge: 'Marketplace',
    title: 'Shop Everything You Love',
    highlight: 'In One Place',
    img: '/shoping-bag.png',
    cta: '/shop',
  },
];

export default function HeroSection() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // As you scroll past the hero, the 3D scene drifts back and fades —
  // it feels like the camera is pulling away from the floating shapes.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1, 1.35]);
  const sceneOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.15]);
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const slide = slides[active];

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-white dark:bg-[#05070f] min-h-[460px] md:min-h-[540px] lg:min-h-[580px]">
      <div className="relative w-full h-full min-h-[460px] md:min-h-[540px] lg:min-h-[580px] bg-gradient-to-br from-blue-50 via-white to-sky-50 dark:from-[#0a0e1a] dark:via-[#0d1424] dark:to-[#0a0e1a]">
        {/* animated 3D backdrop — fills the entire hero, edge to edge, and
            drifts away with scroll for a camera-pulling-back feel. Renders on
            a transparent canvas, so it works unchanged over either theme. */}
        <motion.div style={{ scale: sceneScale, opacity: sceneOpacity, y: sceneY }} className="absolute inset-0">
          <Hero3DScene />
        </motion.div>
        {/* soft vignette so copy stays readable over the 3D scene */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white via-white/55 to-transparent dark:from-[#05070f] dark:via-[#05070f]/55 dark:to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.14),transparent_45%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent dark:from-[#05070f] dark:to-transparent" />

        <motion.div
          style={{ y: contentY, opacity: contentOpacity }}
          className="relative max-w-7xl mx-auto grid h-full min-h-[460px] md:min-h-[540px] lg:min-h-[580px] md:grid-cols-2 items-center px-7 pt-6 pb-14 sm:px-12 md:px-16 lg:px-20"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`copy-${active}`}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.35 }}
              className="relative z-10 text-center md:text-left"
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">{slide.badge} offer</p>
              <h1 className="max-w-xl font-sans text-3xl font-extrabold leading-[1.08] text-gray-900 dark:text-white sm:text-4xl md:text-5xl lg:text-[3.25rem]">
                {slide.title}<br />
                <span className="bg-gradient-to-r from-blue-600 via-sky-600 to-amber-500 dark:from-blue-400 dark:via-sky-300 dark:to-amber-300 bg-clip-text text-transparent">{slide.highlight}</span>
              </h1>
              <Link
                to={slide.cta}
                className="group mt-7 inline-flex items-center gap-3 rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/40 transition-colors hover:bg-blue-500"
              >
                Buy Now
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:rotate-45">
                  <FiArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
            </motion.div>
          </AnimatePresence>

          <div className="relative flex h-full min-h-[210px] items-center justify-center md:min-h-0">
            <AnimatePresence mode="wait">
              <motion.img
                key={slide.img}
                src={slide.img}
                alt={`${slide.badge} offer`}
                initial={{ opacity: 0, x: 30, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30, scale: 0.92 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="h-56 w-full object-contain drop-shadow-2xl sm:h-72 md:absolute md:-right-4 md:h-[22rem] lg:-right-8 lg:h-[25rem]"
              />
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="absolute inset-x-0 bottom-6 md:bottom-8">
          <div className="max-w-7xl mx-auto px-7 sm:px-12 md:px-16 lg:px-20 flex justify-center md:justify-start">
            <div className="flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.badge}
                  onClick={() => setActive(i)}
                  aria-label={`Show ${s.badge}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-8 bg-blue-500' : 'w-3 bg-gray-300 hover:bg-gray-400 dark:bg-white/20 dark:hover:bg-white/40'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}