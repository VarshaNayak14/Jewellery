import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

// Aceternity UI's HeroParallax, adapted for react-router + plain <img> (no
// Next.js) — a tall scroll-driven section where three rows of cards slide
// past each other and tilt out of a 3D perspective as you scroll through it.
export const HeroParallax = ({ products, heading, subheading }) => {
  const firstRow = products.slice(0, 5);
  const secondRow = products.slice(5, 10);
  const thirdRow = products.slice(10, 15);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const springConfig = { stiffness: 300, damping: 30, bounce: 100 };
  // Phones get smaller cards, so the rows slide and drop by less too.
  const isMobile = useIsMobile();
  const slide = isMobile ? 350 : 1000;

  const translateX = useSpring(useTransform(scrollYProgress, [0, 1], [0, slide]), springConfig);
  const translateXReverse = useSpring(useTransform(scrollYProgress, [0, 1], [0, -slide]), springConfig);
  const rotateX = useSpring(useTransform(scrollYProgress, [0, 0.2], [0, 0]), springConfig);
  const opacity = useSpring(useTransform(scrollYProgress, [0, 0.2], [0.2, 1]), springConfig);
  const rotateZ = useSpring(useTransform(scrollYProgress, [0, 0.2], [20, 0]), springConfig);
  // Was [-700, 500] with a 300vh-tall section + py-40 header padding, which
  // pushed the cards far above the fold — the shopper had to scroll a long
  // way past the heading before any product became visible. Shrinking the
  // starting offset and the section height brings the cards into view much
  // sooner while keeping the same 3D reveal effect.
  const translateY = useSpring(useTransform(scrollYProgress, [0, 0.2], [0, isMobile ? 80 : 300]), springConfig);

  return (
    <div
      ref={ref}
      className="min-h-[130vh] md:min-h-[240vh] h-auto pt-10 pb-40 md:pt-24 md:pb-[32rem] overflow-x-clip overflow-y-visible antialiased relative flex flex-col self-auto [perspective:1000px] [transform-style:preserve-3d] bg-white dark:bg-[#05070f]"
    >
      <Header heading={heading} subheading={subheading} />
      <motion.div style={{ rotateX, rotateZ, translateY, opacity }}>
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-4 md:space-x-20 mb-6 md:mb-20">
          {firstRow.map((product) => (
            <ProductCard product={product} translate={translateX} key={product.link} />
          ))}
        </motion.div>
        <motion.div className="flex flex-row mb-6 md:mb-20 space-x-4 md:space-x-20">
          {secondRow.map((product) => (
            <ProductCard product={product} translate={translateXReverse} key={product.link} />
          ))}
        </motion.div>
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-4 md:space-x-20">
          {thirdRow.map((product) => (
            <ProductCard product={product} translate={translateX} key={product.link} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export const Header = ({ heading, subheading }) => {
  return (
    <div className="max-w-7xl relative mx-auto py-6 md:py-16 px-4 w-full left-0 top-0">
      <h1 className="font-display text-2xl sm:text-3xl md:text-7xl font-bold text-gray-900 dark:text-white">{heading}</h1>
      <p className="max-w-2xl text-sm sm:text-base md:text-xl mt-3 md:mt-6 text-gray-600 dark:text-gray-400">{subheading}</p>
    </div>
  );
};

export const ProductCard = ({ product, translate }) => {
  return (
    <motion.div
      style={{ x: translate }}
      whileHover={{ y: -20 }}
      key={product.title}
      className="group/product h-40 w-36 sm:h-56 sm:w-64 md:h-96 md:w-[30rem] relative shrink-0 rounded-xl overflow-hidden"
    >
      <Link to={product.link} className="block group-hover/product:shadow-2xl h-full w-full">
        <img
          src={product.thumbnail}
          className="object-cover object-center absolute h-full w-full inset-0"
          alt={product.title}
          draggable={false}
        />
      </Link>
      <div className="absolute inset-0 h-full w-full opacity-0 group-hover/product:opacity-80 bg-black pointer-events-none transition-opacity duration-300" />
      {/* Phones have no hover — keep the name visible on a soft gradient */}
      <div className="md:hidden absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
      <h2 className="absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-4 text-xs md:text-base line-clamp-2 md:opacity-0 group-hover/product:opacity-100 text-white font-semibold md:font-bold transition-opacity duration-300 pointer-events-none">
        {product.title}
      </h2>
    </motion.div>
  );
};
function useIsMobile() {
  const query = '(max-width: 767px)';
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}
