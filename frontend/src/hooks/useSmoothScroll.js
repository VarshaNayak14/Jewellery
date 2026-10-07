import { useEffect } from 'react';
import Lenis from 'lenis';

// Buttery inertia-based smooth scrolling (Lenis) for the 3D landing page.
// Scoped to whichever component calls this — mount only on Home so every
// other route (Shop, checkout, admin/seller panels) keeps native scrolling.
// Lenis drives the real window scroll position, so framer-motion's
// useScroll()/scrollYProgress (used by the hero + ScrollReveal3D) keeps
// working unchanged.
export default function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);
}
