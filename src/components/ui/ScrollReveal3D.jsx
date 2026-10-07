import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

// True scroll-linked 3D reveal — rotation/opacity/lift are driven directly by
// scroll progress (not a one-shot whileInView trigger), so the element
// visibly tilts up out of the page as you scroll it into view and tilts
// back if you scroll past it. Wrap any section heading, row, or card group.
export default function ScrollReveal3D({
  children,
  className = '',
  style = {},
  axis = 'x',       // 'x' = tilts up towards viewer, 'y' = swivels in sideways
  angle = 24,        // starting tilt in degrees
  distance = 70,     // starting vertical offset in px
  start = 'start 92%',
  end = 'start 55%',
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: [start, end] });

  const rotate = useTransform(scrollYProgress, [0, 1], [angle, 0]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [distance, 0]);
  const rotateProp = axis === 'x' ? { rotateX: rotate } : { rotateY: rotate };

  return (
    <div ref={ref} style={{ perspective: 1400 }} className={`h-full ${className}`}>
      <motion.div className="h-full" style={{ ...rotateProp, opacity, y, transformStyle: 'preserve-3d', ...style }}>
        {children}
      </motion.div>
    </div>
  );
}
