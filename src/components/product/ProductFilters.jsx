import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiX, FiAward } from 'react-icons/fi';
import { SORT_OPTIONS } from '../../utils/helpers';
import { productAPI } from '../../services/api';
import { METALS, PURITIES, RING_SIZES, METAL_LABEL } from '../../utils/jewellery';

const PRICE_RANGES = [
  { label: 'Under ₹10K', min: '', max: '10000' },
  { label: '₹10K – 25K', min: '10000', max: '25000' },
  { label: '₹25K – 50K', min: '25000', max: '50000' },
  { label: '₹50K – 1L', min: '50000', max: '100000' },
  { label: 'Above ₹1L', min: '100000', max: '' },
];

const GENDERS = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'kids', label: 'Kids' },
  { value: 'unisex', label: 'Unisex' },
];

const METAL_SWATCH = {
  gold: 'linear-gradient(135deg,#f6e2b0,#d4a64a)',
  'rose-gold': 'linear-gradient(135deg,#f6d2c4,#c98a73)',
  'white-gold': 'linear-gradient(135deg,#f5f5f2,#c9c9c4)',
  silver: 'linear-gradient(135deg,#f1f3f5,#a9b0b7)',
  platinum: 'linear-gradient(135deg,#eceff1,#8f99a3)',
  other: 'linear-gradient(135deg,#e7dccb,#a58a5f)',
};

const FilterSection = ({ title, children, defaultOpen = true, count }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[rgba(169,131,69,0.18)] dark:border-white/10 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between mb-3">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b5638] dark:text-[#e6d3ad]">
          {title}
          {count > 0 && <span className="w-5 h-5 rounded-full bg-[#a98345] text-white text-[10px] flex items-center justify-center tracking-normal">{count}</span>}
        </span>
        <FiChevronDown className={`w-4 h-4 text-[#a58a5f] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const chipCls = (on) => `text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
  on
    ? 'bg-[#a98345] border-[#a98345] text-white shadow-sm'
    : 'border-[rgba(169,131,69,0.3)] dark:border-white/15 text-[#5c4b33] dark:text-gray-300 hover:border-[#a98345] hover:text-[#8b6835] dark:hover:text-[#e6c37e]'
}`;

// Multi-select params are stored comma separated, e.g. metal=gold,rose-gold
const toggleIn = (csv, value) => {
  const set = new Set((csv || '').split(',').filter(Boolean));
  set.has(value) ? set.delete(value) : set.add(value);
  return [...set].join(',');
};
const hasIn = (csv, value) => (csv || '').split(',').includes(value);

export default function ProductFilters({ params, onUpdate, onClear }) {
  const [priceRange, setPriceRange] = useState({ min: params.minPrice || '', max: params.maxPrice || '' });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    productAPI.getCategoryTree()
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setPriceRange({ min: params.minPrice || '', max: params.maxPrice || '' });
  }, [params.minPrice, params.maxPrice]);

  const categoryData = params.category ? categories.find((c) => c.slug === params.category) : null;
  const selectedMetals = (params.metal || '').split(',').filter(Boolean);
  const purityOptions = [...new Set(
    (selectedMetals.length ? selectedMetals : ['gold', 'silver', 'platinum'])
      .map((m) => METALS.find((x) => x.value === m)?.rateMetal)
      .filter(Boolean)
      .flatMap((rm) => PURITIES[rm]),
  )];

  const badges = [
    params.subCategory && { key: 'subCategory', label: params.subCategory },
    ...selectedMetals.map((m) => ({ key: 'metal', value: m, label: METAL_LABEL[m] || m })),
    ...(params.purity || '').split(',').filter(Boolean).map((p) => ({ key: 'purity', value: p, label: p })),
    ...(params.gender || '').split(',').filter(Boolean).map((g) => ({ key: 'gender', value: g, label: g })),
    params.hallmarked === 'true' && { key: 'hallmarked', label: 'Hallmarked' },
    params.size && { key: 'size', label: `Size ${params.size}` },
    (params.minPrice || params.maxPrice) && { key: 'price', label: `₹${params.minPrice || 0} – ${params.maxPrice ? `₹${params.maxPrice}` : 'any'}` },
  ].filter(Boolean);

  const removeBadge = (b) => {
    if (b.key === 'price') return onUpdate({ minPrice: '', maxPrice: '' });
    if (b.value) return onUpdate({ [b.key]: toggleIn(params[b.key], b.value) });
    onUpdate({ [b.key]: '' });
  };

  return (
    <div
      className="bg-[#fffdf8] dark:bg-white/5 rounded-3xl p-5 border border-[rgba(169,131,69,0.22)] dark:border-white/10 sticky overflow-y-auto no-scrollbar"
      style={{ top: 'calc(var(--navbar-height, 96px) + 12px)', maxHeight: 'calc(100vh - var(--navbar-height, 96px) - 2rem)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#2f2619] dark:text-white">Refine</h3>
        {badges.length > 0 && (
          <button onClick={onClear} className="text-xs font-semibold text-[#8b6835] dark:text-[#e6c37e] hover:underline">Clear all</button>
        )}
      </div>

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5 pb-4 border-b border-[rgba(169,131,69,0.18)] dark:border-white/10">
          {badges.map((b) => (
            <span key={`${b.key}-${b.value || ''}`} className="flex items-center gap-1 bg-[#f5ecd9] dark:bg-[#a98345]/20 text-[#6b4c26] dark:text-[#f0d79f] text-xs pl-2.5 pr-1.5 py-1 rounded-full font-medium capitalize">
              {b.label}
              <button onClick={() => removeBadge(b)} className="p-0.5 hover:opacity-70" aria-label={`Remove ${b.label}`}><FiX className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}

      <FilterSection title="Sort by" defaultOpen={false}>
        <div className="grid gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => onUpdate({ sort: opt.value })}
              className={`text-left text-sm px-3 py-2 rounded-xl transition-colors ${params.sort === opt.value ? 'bg-[#f5ecd9] dark:bg-[#a98345]/20 text-[#6b4c26] dark:text-[#f0d79f] font-semibold' : 'text-[#5c4b33] dark:text-gray-300 hover:bg-[#fbf7ef] dark:hover:bg-white/5'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {categories.length > 1 && (
        <FilterSection title="Collection">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button key={cat.slug} className={chipCls(params.category === cat.slug)}
                onClick={() => onUpdate({ category: params.category === cat.slug ? '' : cat.slug, subCategory: '' })}>
                {cat.name}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {categoryData?.types?.length > 0 && (
        <FilterSection title="Jewellery type" count={params.subCategory ? 1 : 0}>
          <div className="flex flex-wrap gap-2">
            {categoryData.types.map((t) => (
              <button key={t} className={chipCls(params.subCategory === t)}
                onClick={() => onUpdate({ subCategory: params.subCategory === t ? '' : t })}>{t}</button>
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Metal" count={selectedMetals.length}>
        <div className="grid grid-cols-2 gap-2">
          {METALS.filter((m) => m.value !== 'other').map((m) => {
            const on = hasIn(params.metal, m.value);
            return (
              <button key={m.value} onClick={() => onUpdate({ metal: toggleIn(params.metal, m.value), purity: '' })}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs font-medium transition-all ${on ? 'border-[#a98345] bg-[#f5ecd9] dark:bg-[#a98345]/20 text-[#6b4c26] dark:text-[#f0d79f]' : 'border-[rgba(169,131,69,0.25)] dark:border-white/10 text-[#5c4b33] dark:text-gray-300 hover:border-[#a98345]'}`}>
                <span className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-black/5" style={{ background: METAL_SWATCH[m.value] }} />
                {m.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Purity" count={(params.purity || '').split(',').filter(Boolean).length}>
        <div className="flex flex-wrap gap-2">
          {purityOptions.map((p) => (
            <button key={p} className={chipCls(hasIn(params.purity, p))} onClick={() => onUpdate({ purity: toggleIn(params.purity, p) })}>{p}</button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Price">
        <div className="flex flex-wrap gap-2 mb-3">
          {PRICE_RANGES.map((r) => (
            <button key={r.label} className={chipCls((params.minPrice || '') === r.min && (params.maxPrice || '') === r.max)}
              onClick={() => onUpdate({ minPrice: r.min, maxPrice: r.max })}>{r.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="number" value={priceRange.min} placeholder="Min ₹" onChange={(e) => setPriceRange((p) => ({ ...p, min: e.target.value }))}
            className="w-full min-w-0 px-3 py-2 rounded-xl text-sm bg-[#fbf7ef] dark:bg-white/5 border border-[rgba(169,131,69,0.25)] dark:border-white/10 text-[#2f2619] dark:text-white focus:outline-none focus:border-[#a98345]" />
          <span className="text-[#a58a5f]">–</span>
          <input type="number" value={priceRange.max} placeholder="Max ₹" onChange={(e) => setPriceRange((p) => ({ ...p, max: e.target.value }))}
            className="w-full min-w-0 px-3 py-2 rounded-xl text-sm bg-[#fbf7ef] dark:bg-white/5 border border-[rgba(169,131,69,0.25)] dark:border-white/10 text-[#2f2619] dark:text-white focus:outline-none focus:border-[#a98345]" />
          <button onClick={() => onUpdate({ minPrice: priceRange.min, maxPrice: priceRange.max })}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#a98345] hover:bg-[#8b6835]">Go</button>
        </div>
      </FilterSection>

      <FilterSection title="Shop for" defaultOpen={false} count={(params.gender || '').split(',').filter(Boolean).length}>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <button key={g.value} className={chipCls(hasIn(params.gender, g.value))} onClick={() => onUpdate({ gender: toggleIn(params.gender, g.value) })}>{g.label}</button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Ring size" defaultOpen={false} count={params.size ? 1 : 0}>
        <div className="grid grid-cols-5 gap-1.5">
          {RING_SIZES.map((s) => (
            <button key={s} onClick={() => onUpdate({ size: params.size === s ? '' : s })}
              className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${params.size === s ? 'bg-[#a98345] border-[#a98345] text-white' : 'border-[rgba(169,131,69,0.25)] dark:border-white/10 text-[#5c4b33] dark:text-gray-300 hover:border-[#a98345]'}`}>
              {s}
            </button>
          ))}
        </div>
      </FilterSection>

      <button onClick={() => onUpdate({ hallmarked: params.hallmarked === 'true' ? '' : 'true' })}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all ${params.hallmarked === 'true' ? 'border-[#a98345] bg-[#f5ecd9] dark:bg-[#a98345]/20' : 'border-[rgba(169,131,69,0.25)] dark:border-white/10'}`}>
        <span className="flex items-center gap-2 text-sm font-medium text-[#2f2619] dark:text-white">
          <FiAward className="w-4 h-4 text-[#a98345]" /> BIS hallmarked only
        </span>
        <span className={`relative w-9 h-5 rounded-full transition-colors ${params.hallmarked === 'true' ? 'bg-[#a98345]' : 'bg-gray-300 dark:bg-gray-600'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${params.hallmarked === 'true' ? 'left-[18px]' : 'left-0.5'}`} />
        </span>
      </button>
    </div>
  );
}
