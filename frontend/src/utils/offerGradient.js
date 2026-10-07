// Offer cards store their colours as Tailwind class names ("from-rose-600",
// "to-orange-500"). Tailwind only ships classes it finds in the source code,
// so a colour saved in the database but not written anywhere in the code
// renders as no background at all (white card, invisible white text).
// This turns those names into a real CSS gradient so every saved colour works.

const PALETTE = {
  slate: { 600: '#475569', 700: '#334155', 800: '#1e293b' },
  gray: { 600: '#4b5563', 700: '#374151', 800: '#1f2937' },
  red: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b' },
  orange: { 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412' },
  amber: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e' },
  yellow: { 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e' },
  lime: { 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f' },
  green: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534' },
  emerald: { 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46' },
  teal: { 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59' },
  cyan: { 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490' },
  sky: { 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1' },
  blue: { 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af' },
  indigo: { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3' },
  violet: { 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9' },
  purple: { 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8' },
  fuchsia: { 500: '#d946ef', 600: '#c026d3', 700: '#a21caf' },
  pink: { 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d' },
  rose: { 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239' },
};

// "from-rose-600" → "#e11d48" (nearest shade of that colour if the exact one isn't listed)
const toHex = (cls, fallback) => {
  const m = String(cls || '').match(/^(?:from|via|to)-([a-z]+)-(\d{2,3})$/);
  const shades = m && PALETTE[m[1]];
  if (!shades) return fallback;
  if (shades[m[2]]) return shades[m[2]];
  const nearest = Object.keys(shades).map(Number).sort((a, b) => Math.abs(a - m[2]) - Math.abs(b - m[2]))[0];
  return shades[nearest];
};

export const offerGradientStyle = (from, to) => ({
  backgroundImage: `linear-gradient(to bottom right, ${toHex(from, '#2563eb')}, ${toHex(to, '#4338ca')})`,
});
