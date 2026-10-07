import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';

// Horizontal (or vertical) accordion image gallery — panels sit side by side
// at equal size; the active one expands to `expandRatio` of the container
// while the rest share what's left. Hover (or click) to switch panels.
// GSAP drives the resize, the tilt, and the mount-in stagger.
export default function AccordionGallery({
  items = [],
  defaultIndex = 0,
  expandRatio = 0.5,
  trigger = 'hover',
  accentColor = '#ffffff',
  overlayColor = '#060010',
  textColor = '#ffffff',
  grayscale = true,
  showLabels = true,
  duration = 0.6,
  ease = 'power3.out',
  parallax = 0.4,
  tilt = 8,
  stagger = 0.06,
  height = 440,
  gap = 10,
  radius = 16,
  orientation = 'horizontal',
}) {
  const [active, setActive] = useState(defaultIndex);
  const containerRef = useRef(null);
  const panelRefs = useRef([]);
  const imgRefs = useRef([]);
  const horizontal = orientation === 'horizontal';

  const sizeFor = (i) => {
    if (i === active) return `${expandRatio * 100}%`;
    const restCount = Math.max(items.length - 1, 1);
    return `${((1 - expandRatio) / restCount) * 100}%`;
  };

  // Animate every panel's basis whenever the active index changes.
  useEffect(() => {
    panelRefs.current.forEach((el, i) => {
      if (!el) return;
      gsap.to(el, {
        [horizontal ? 'width' : 'height']: sizeFor(i),
        duration,
        ease,
      });
      gsap.to(imgRefs.current[i], {
        filter: grayscale && i !== active ? 'grayscale(1) brightness(0.7)' : 'grayscale(0) brightness(1)',
        scale: i === active ? 1 + parallax * 0.12 : 1,
        duration,
        ease,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Mount-in stagger entrance.
  useEffect(() => {
    gsap.fromTo(
      panelRefs.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger }
    );
  }, [stagger]);

  const handleTilt = (e, i) => {
    if (!tilt) return;
    const el = panelRefs.current[i];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(el, { rotateY: px * tilt, rotateX: -py * tilt, duration: 0.4, ease: 'power2.out', transformPerspective: 800 });
  };

  const resetTilt = (i) => {
    const el = panelRefs.current[i];
    if (!el) return;
    gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.5, ease: 'power2.out' });
  };

  return (
    <div
      ref={containerRef}
      className={`flex w-full ${horizontal ? 'flex-row' : 'flex-col'}`}
      style={{ height, gap }}
    >
      {items.map((item, i) => {
        const isActive = i === active;
        const openHandlers =
          trigger === 'hover'
            ? { onMouseEnter: () => setActive(i) }
            : { onClick: () => setActive(i) };

        return (
          <div
            key={item.label + i}
            ref={(el) => (panelRefs.current[i] = el)}
            {...openHandlers}
            onMouseMove={(e) => handleTilt(e, i)}
            onMouseLeave={() => resetTilt(i)}
            className="relative flex-shrink-0 overflow-hidden cursor-pointer group"
            style={{
              width: horizontal ? sizeFor(i) : '100%',
              height: horizontal ? '100%' : sizeFor(i),
              borderRadius: radius,
              boxShadow: isActive ? `0 0 0 2px ${accentColor}40` : 'none',
              willChange: 'width, height, transform',
            }}
          >
            {item.link ? (
              <Link to={item.link} className="absolute inset-0 block" aria-label={item.label}>
                <PanelBody item={item} i={i} isActive={isActive} imgRefs={imgRefs} overlayColor={overlayColor} textColor={textColor} showLabels={showLabels} />
              </Link>
            ) : (
              <PanelBody item={item} i={i} isActive={isActive} imgRefs={imgRefs} overlayColor={overlayColor} textColor={textColor} showLabels={showLabels} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PanelBody({ item, i, isActive, imgRefs, overlayColor, textColor, showLabels }) {
  return (
    <>
      <img
        ref={(el) => (imgRefs.current[i] = el)}
        src={item.image}
        alt={item.label}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'grayscale(1) brightness(0.7)' }}
        draggable={false}
      />
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: `linear-gradient(to top, ${overlayColor}cc, ${overlayColor}00 55%)`,
          opacity: isActive ? 0.55 : 0.85,
        }}
      />
      {showLabels && (
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p
            className="font-display font-bold whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-300"
            style={{ color: textColor, fontSize: isActive ? '1.25rem' : '0.8rem', opacity: isActive ? 1 : 0.75 }}
          >
            {item.label}
          </p>
        </div>
      )}
    </>
  );
}
