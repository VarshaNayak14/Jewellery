import { useState, useEffect } from 'react';
import { FiCheck, FiExternalLink, FiSave } from 'react-icons/fi';
import { sellerAPI } from '../../services/api';
import { useSellerStore } from '../../store/sellerStore';
import { getStoreUrl } from '../../utils/subdomain';
import SellerLayout from './SellerLayout';
import toast from 'react-hot-toast';
import { capsOf } from '../../utils/planFeatures';
import { PlanLockBadge } from '../../components/common/PlanLock';

const THEMES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'A full-width banner with your logo and shop name up top.',
    preview: (accent) => (
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white">
        <div className="h-10" style={{ background: accent }} />
        <div className="p-2 grid grid-cols-3 gap-1">
          {[0, 1, 2].map(i => <div key={i} className="h-8 bg-gray-100 rounded" />)}
        </div>
      </div>
    ),
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, centered, lots of whitespace — lets products speak for themselves.',
    preview: (accent) => (
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white p-3">
        <div className="w-6 h-6 rounded-full mx-auto mb-1" style={{ background: accent }} />
        <div className="h-1.5 w-12 bg-gray-200 rounded mx-auto mb-2" />
        <div className="grid grid-cols-3 gap-1">
          {[0, 1, 2].map(i => <div key={i} className="h-8 bg-gray-100 rounded" />)}
        </div>
      </div>
    ),
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Bold color-block hero with playful shapes — for stores with energy.',
    preview: (accent) => (
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white">
        <div className="h-12 relative overflow-hidden" style={{ background: accent }}>
          <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/20" />
        </div>
        <div className="p-2 grid grid-cols-3 gap-1">
          {[0, 1, 2].map(i => <div key={i} className="h-8 bg-gray-100 rounded" />)}
        </div>
      </div>
    ),
  },
  {
    id: 'royal',
    name: 'Royal',
    description: 'Dark heritage look — banner in a gold arch, elegant serif shop name.',
    preview: (accent) => (
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white">
        <div className="h-12 flex items-center justify-between px-3" style={{ background: '#1c140d' }}>
          <div className="space-y-1">
            <div className="h-1 w-6 rounded" style={{ background: '#d4af6a' }} />
            <div className="h-1.5 w-12 rounded bg-[#f6ecd9]/80" />
          </div>
          <div className="w-7 h-9 rounded-t-full border" style={{ borderColor: '#d4af6a', background: accent }} />
        </div>
        <div className="p-2 grid grid-cols-3 gap-1">
          {[0, 1, 2].map(i => <div key={i} className="h-8 bg-gray-100 rounded" />)}
        </div>
      </div>
    ),
  },
  {
    id: 'boutique',
    name: 'Boutique',
    description: 'Split screen — your banner on one half, shop details on a bold color panel.',
    preview: (accent) => (
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white">
        <div className="h-12 grid grid-cols-2">
          <div className="bg-gray-300" />
          <div className="flex flex-col justify-center gap-1 px-2" style={{ background: accent }}>
            <div className="h-1.5 w-10 rounded bg-white/90" />
            <div className="h-1 w-7 rounded bg-white/60" />
          </div>
        </div>
        <div className="p-2 grid grid-cols-3 gap-1">
          {[0, 1, 2].map(i => <div key={i} className="h-8 bg-gray-100 rounded" />)}
        </div>
      </div>
    ),
  },
  {
    id: 'showcase',
    name: 'Showcase',
    description: 'Wide cover banner with a floating shop card on top — like a profile page.',
    preview: (accent) => (
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white">
        <div className="h-9" style={{ background: accent }} />
        <div className="mx-2 -mt-4 relative bg-white rounded-md shadow border border-gray-100 p-1.5 flex items-center gap-1.5">
          <div className="w-5 h-5 rounded border-2 bg-white" style={{ borderColor: accent }} />
          <div className="h-1.5 w-12 bg-gray-300 rounded" />
        </div>
        <div className="p-2 grid grid-cols-3 gap-1">
          {[0, 1, 2].map(i => <div key={i} className="h-5 bg-gray-100 rounded" />)}
        </div>
      </div>
    ),
  },
];

const COLOR_PRESETS = ['#a98345', '#dc2626', '#059669', '#d97706', '#db2777', '#0891b2', '#111827'];

export default function SellerStoreCustomize() {
  const { seller, updateSeller } = useSellerStore();
  const caps = capsOf(seller?.planSnapshot);
  const [theme, setTheme] = useState('classic');
  const [themeColor, setThemeColor] = useState('#a98345');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (seller) {
      setTheme(seller.theme || 'classic');
      setThemeColor(seller.themeColor || '#a98345');
    }
  }, [seller]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await sellerAPI.updateShop({ theme, themeColor });
      updateSeller(data.seller);
      toast.success('Storefront updated!');
    } catch (err) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <SellerLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Customize Store</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Pick a theme and accent color for your public storefront</p>
        </div>
        {seller?.shopSlug && (
          <a href={getStoreUrl(seller.shopSlug)} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
            Preview Your Store <FiExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Theme</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {THEMES.map((t) => {
            const active = theme === t.id;
            // Classic is always free; every other theme needs "Premium store themes" on the plan.
            const locked = t.id !== 'classic' && !caps.premiumThemes && seller?.theme !== t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => locked
                  ? toast.error(`${t.name} theme is not included in your ${seller?.planSnapshot?.name || 'current'} plan. Contact admin to upgrade.`)
                  : setTheme(t.id)}
                className={`text-left rounded-2xl p-3 border-2 transition-all ${locked ? 'opacity-60 cursor-not-allowed border-gray-100 dark:border-gray-800' : active ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10' : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'}`}
              >
                <div className="relative mb-3">
                  {t.preview(themeColor)}
                  {active && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                      <FiCheck className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">{t.name} {locked && <PlanLockBadge />}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{t.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Accent Color</h3>
        <div className="flex items-center flex-wrap gap-3 mb-4">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setThemeColor(c)}
              className={`w-9 h-9 rounded-full border-2 transition-transform ${themeColor.toLowerCase() === c ? 'border-gray-900 dark:border-gray-100 scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="w-9 h-9 rounded-full border-0 cursor-pointer bg-transparent"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{themeColor}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">This color is used for your store's header accent, buttons, and hero sections.</p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:opacity-90 disabled:opacity-60 transition-all shadow-lg text-sm"
      >
        <FiSave className="w-5 h-5" />
        {saving ? 'Saving...' : 'Save Storefront'}
      </button>
    </SellerLayout>
  );
}
