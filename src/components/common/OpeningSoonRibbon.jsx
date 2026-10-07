import { useState } from 'react';

/**
 * OpeningSoonRibbon
 * ------------------
 * Full-website "OPENING SOON" banner made of TWO crossing diagonal
 * ribbons (X pattern), like the red tape reference image, each with
 * a continuously scrolling marquee, over a blurred site background.
 * It's a fixed overlay, so it shows on top of EVERY page of the site
 * — not confined to a box or a single section — until the site is
 * ready to launch.
 *
 * Tap/click anywhere on it and it disappears, revealing the website
 * underneath (for that visit — it comes back on the next page load).
 *
 * To remove it permanently: delete the <OpeningSoonRibbon /> line in App.jsx.
 * To change the text, edit the `text` constant below.
 */
function RibbonStrip({ rotate }) {
  const text = 'OPENING SOON';
  const items = Array.from({ length: 20 });

  return (
    <div
      className="absolute left-1/2 top-1/2 w-[300vmax]"
      style={{ transform: `translate(-50%, -50%) rotate(${rotate}deg)` }}
    >
      <div className="bg-red-600 border-y-2 border-white/80 py-2 sm:py-3 overflow-hidden whitespace-nowrap shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
        <div className="flex w-max animate-marquee">
          {items.concat(items).map((_, i) => (
            <span
              key={i}
              className="flex items-center shrink-0 text-white font-extrabold uppercase tracking-wider text-xs sm:text-base px-3"
            >
              {text}
              <span className="mx-3 w-1.5 h-1.5 rounded-full bg-yellow-300 inline-block" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OpeningSoonRibbon() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      onClick={() => setVisible(false)}
      role="button"
      aria-label="Tap to preview the website"
      title="Tap to preview the website"
      className="cursor-pointer"
    >
      {/* Blurs + dims the entire website behind the ribbon, on every page */}
      <div className="fixed inset-0 z-[9998] backdrop-blur-md bg-white/30 dark:bg-black/50" />

      {/* Crossing ribbon with continuously scrolling text */}
      <div className="fixed inset-0 z-[9999] overflow-hidden">
        <RibbonStrip rotate={25} />
        <RibbonStrip rotate={-25} />
      </div>
    </div>
  );
}