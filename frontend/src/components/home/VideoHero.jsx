import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowDownRight, FiArrowRight } from 'react-icons/fi';
import './VideoHero.css';

// Put your video at public/jewelry/hero.mp4
const VIDEO_SRC = '/jewelry/hero.mp4';
// Poster = exact first frame of the video, so there is no visual jump when playback starts.
const VIDEO_POSTER = '/jewelry/hero-poster.jpg';

export default function VideoHero() {
  const videoRef = useRef(null);
  const [failed, setFailed] = useState(false);

  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Pause the video while the hero is off-screen (saves battery / data).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || reduceMotion || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.15 });
    io.observe(v);
    return () => io.disconnect();
  }, [reduceMotion]);

  return (
    <section className="vh" aria-label="Aurelle jewellery hero">
      {failed || reduceMotion ? (
        <img className="vh-media" src={VIDEO_POSTER} alt="Gold jewellery" />
      ) : (
        <video
          ref={videoRef}
          className="vh-media"
          src={VIDEO_SRC}
          poster={VIDEO_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          onError={() => setFailed(true)}
        />
      )}
      <div className="vh-shade" aria-hidden="true" />

      <motion.div
        className="vh-copy"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="jewel-eyebrow"><i /> Modern heirlooms, made to stay</span>
        <h1>Some things<br />are <em>forever.</em></h1>
        <p>Gold-lit details. Thoughtful design. Jewellery that feels like it was always yours.</p>
        <div className="vh-actions">
          <Link to="/shop" className="jewel-button jewel-button-dark">
            Discover the collection <FiArrowRight aria-hidden="true" />
          </Link>
          <a className="jewel-story-link" href="#the-collection">
            Our point of view <FiArrowDownRight aria-hidden="true" />
          </a>
        </div>
      </motion.div>

      <div className="vh-hint">
      </div>
    </section>
  );
}