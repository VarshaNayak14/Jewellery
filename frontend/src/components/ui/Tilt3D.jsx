import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

// Cursor-tracked 3D tilt wrapper. Wrap any card/element in this to give it
// real perspective depth that follows the pointer, plus a soft glare sweep.
export default function Tilt3D({
  children,
  className = '',
  style = {},
  max = 14,       // max rotation in degrees
  scale = 1.03,   // hover scale
  glare = true,
  lift = 22,      // px translateZ lift on hover
  idle = false,   // keep a slow continuous 3D sway going even without hover
  idleAmount = 5, // degrees of idle sway
  idleDuration = 6,
  as: Component = motion.div,
}) {
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const springCfg = { stiffness: 220, damping: 20, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), springCfg);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), springCfg);
  const glareX = useTransform(px, [0, 1], ['0%', '100%']);
  const glareY = useTransform(py, [0, 1], ['0%', '100%']);
  const glareBg = useTransform([glareX, glareY], ([gx, gy]) => `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.35), transparent 55%)`);
  const z = useSpring(0, springCfg);

  const handleMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
    z.set(lift);
  };

  const handleLeave = () => {
    px.set(0.5);
    py.set(0.5);
    z.set(0);
  };

  const idleWrapperProps = idle
    ? {
        animate: { rotateX: [0, idleAmount, 0, -idleAmount, 0], rotateY: [0, -idleAmount, 0, idleAmount, 0] },
        transition: { duration: idleDuration, repeat: Infinity, ease: 'easeInOut' },
        style: { transformStyle: 'preserve-3d' },
      }
    : { style: { transformStyle: 'preserve-3d' } };

  const body = (
    <Component
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      whileHover={{ scale }}
      style={{
        rotateX,
        rotateY,
        translateZ: z,
        transformStyle: 'preserve-3d',
        ...style,
      }}
      className="relative will-change-transform group h-full"
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: glareBg, transform: 'translateZ(1px)' }}
        />
      )}
    </Component>
  );

  return (
    <div ref={ref} style={{ perspective: 1200 }} className={className}>
      {idle ? <motion.div className="h-full" {...idleWrapperProps}>{body}</motion.div> : body}
    </div>
  );
}