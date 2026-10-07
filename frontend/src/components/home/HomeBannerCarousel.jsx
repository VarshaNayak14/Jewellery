import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { offerAPI } from '../../services/api';
import './HomeBannerCarousel.css';

function offsetFor(index, active, count) {
  let offset = index - active;
  if (offset > count / 2) offset -= count;
  if (offset < -count / 2) offset += count;
  return offset;
}

export default function HomeBannerCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    let cancelled = false;
    offerAPI.getApproved({ placement: 'homepage' })
      .then(({ offers }) => {
        if (cancelled || !Array.isArray(offers)) return;
        setBanners(offers.filter((offer) => (
          (offer.placement || (offer.tag || offer.description || offer.discountText ? 'festival' : 'homepage')) === 'homepage'
          && offer.image
        )).map((offer) => ({
          key: offer._id,
          image: offer.image,
        })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const count = banners.length;

  useEffect(() => {
    if (count === 0) {
      setActive(0);
      return;
    }
    setActive((index) => (Number.isFinite(index) ? ((index % count) + count) % count : 0));
  }, [count]);

  useEffect(() => {
    if (paused || reducedMotion || count < 2) return undefined;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % count), 5000);
    return () => window.clearInterval(timer);
  }, [count, paused, reducedMotion]);

  const navigate = (direction) => {
    if (count > 0) setActive((index) => (index + direction + count) % count);
  };

  if (count === 0) return null;

  return (
    <section
      className="home-banner"
      aria-label="Featured jewellery and offers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') navigate(-1);
        if (event.key === 'ArrowRight') navigate(1);
      }}
    >
      <div className="home-banner__stage" aria-roledescription="carousel">
        {banners.map((banner, index) => {
          const offset = offsetFor(index, active, count);
          const distance = Math.abs(offset);
          const visible = distance <= 2;
          const scale = distance === 0 ? 1 : distance === 1 ? 0.82 : 0.72;
          const linkProps = {
            key: banner.key,
            className: `home-banner__slide${distance === 0 ? ' is-active' : ''}`,
            style: {
              '--slide-offset': offset,
              '--slide-scale': scale,
              '--slide-z': 20 - distance,
            },
            'aria-label': `Homepage offer ${index + 1}`,
            'aria-hidden': !visible,
            tabIndex: distance === 0 ? 0 : -1,
            onClick: (event) => {
              if (distance !== 0) {
                event.preventDefault();
                setActive(index);
              }
            },
          };
          return (
            <Link {...linkProps} to="/shop">
              <img src={banner.image} alt="" loading={index < 3 ? 'eager' : 'lazy'} />
            </Link>
          );
        })}
      </div>

      {count > 1 && (
        <div className="home-banner__controls">
          <button type="button" aria-label="Previous banner" onClick={() => navigate(-1)}>
            <FiChevronLeft aria-hidden="true" />
          </button>
          <div className="home-banner__dots" role="tablist" aria-label="Choose a banner">
            {banners.map((banner, index) => (
              <button
                key={banner.key}
                type="button"
                role="tab"
                aria-label={`Show banner ${index + 1}`}
                aria-selected={active === index}
                className={active === index ? 'is-active' : ''}
                onClick={() => setActive(index)}
              />
            ))}
          </div>
          <button type="button" aria-label="Next banner" onClick={() => navigate(1)}>
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
