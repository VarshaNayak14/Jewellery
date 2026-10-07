import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '../common/BrandLogo';

const SESSION_KEY = 'gk_intro_played';

// One-time cinematic splash shown the first time a visitor lands on the
// homepage in a session — a few particles fly past in 3D, the logo tilts
// in out of the depth and settles center-frame, then the whole overlay
// pulls away (zoom + tilt) to reveal the site behind it.
export default function IntroLoader() {
  const [phase, setPhase] = useState(() => (sessionStorage.getItem(SESSION_KEY) ? 'done' : 'playing'));

  useEffect(() => {
    if (phase === 'done') return;
    document.body.style.overflow = 'hidden';
    const exitTimer = setTimeout(() => setPhase('exiting'), 1900);
    const doneTimer = setTimeout(() => {
      setPhase('done');
      sessionStorage.setItem(SESSION_KEY, '1');
      document.body.style.overflow = '';
    }, 2650);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === 'done') return null;

  const particles = [
    { x: '15%', y: '25%', size: 10, delay: 0, color: '#3b82f6' },
    { x: '82%', y: '20%', size: 14, delay: 0.1, color: '#f59e0b' },
    { x: '78%', y: '72%', size: 8, delay: 0.2, color: '#38bdf8' },
    { x: '20%', y: '75%', size: 12, delay: 0.15, color: '#a78bfa' },
    { x: '50%', y: '12%', size: 7, delay: 0.25, color: '#f59e0b' },
    { x: '90%', y: '48%', size: 9, delay: 0.3, color: '#3b82f6' },
  ];

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-white dark:bg-[#05070f] overflow-hidden"
          initial={{ opacity: 1 }}
          animate={phase === 'exiting' ? { opacity: 0, scale: 1.2, rotateX: 10 } : { opacity: 1 }}
          transition={{ duration: 0.65, ease: [0.7, 0, 0.84, 0] }}
          style={{ perspective: 1200 }}
        >
          {/* radial glow backdrop */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(59,130,246,0.16),transparent_55%)]" />

          {/* particles flying past in depth */}
          {particles.map((p, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full blur-[1px]"
              style={{ left: p.x, top: p.y, width: p.size, height: p.size, background: p.color }}
              initial={{ opacity: 0, scale: 0, z: -600 }}
              animate={{ opacity: [0, 1, 0.6, 0], scale: [0, 1.4, 1, 0.6], z: [-600, 0, 200, 500] }}
              transition={{ duration: 1.8, delay: p.delay, ease: 'easeOut' }}
            />
          ))}

          {/* logo — tilts in from depth, settles, then holds */}
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.4, rotateY: -110, z: -400 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0, z: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <BrandLogo className="scale-[1.6]" />
            <motion.div
              className="mt-3 h-[3px] w-40 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-amber-400"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.3, delay: 0.65, ease: 'easeInOut' }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
