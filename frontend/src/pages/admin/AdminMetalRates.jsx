import { useEffect, useState } from 'react';
import { FiRefreshCw, FiSave, FiTrendingUp, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { metalRateAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import { PURITIES, formatINR } from '../../utils/jewellery';

const METAL_META = {
  gold: { label: 'Gold', swatch: 'from-amber-300 via-yellow-400 to-amber-600', note: 'Also used for Rose Gold and White Gold of the same karat' },
  silver: { label: 'Silver', swatch: 'from-gray-200 via-gray-300 to-gray-500', note: 'Fine (999) and Sterling (925)' },
  platinum: { label: 'Platinum', swatch: 'from-slate-200 via-slate-300 to-slate-500', note: 'Pt 950' },
};

const keyOf = (metal, purity) => `${metal}:${purity}`;

export default function AdminMetalRates({ Wrapper = AdminPageWrapper }) {
  const [values, setValues] = useState({});
  const [original, setOriginal] = useState({});
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await metalRateAPI.getAll();
      const map = {};
      const m = {};
      (d.rates || []).forEach((r) => {
        map[keyOf(r.metal, r.purity)] = String(r.ratePerGram);
        m[keyOf(r.metal, r.purity)] = r;
      });
      setValues(map);
      setOriginal(map);
      setMeta(m);
      setUpdatedAt(d.updatedAt);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changed = Object.keys(values).filter((k) => values[k] !== original[k] && values[k] !== '');

  // 24K drives the lower karats: 22K = 91.6%, 18K = 75%, 14K = 58.5%
  const fillFrom24K = () => {
    const base = Number(values[keyOf('gold', '24K')]);
    if (!base) return toast.error('Enter the 24K rate first');
    setValues((v) => ({
      ...v,
      [keyOf('gold', '22K')]: String(Math.round(base * 0.916)),
      [keyOf('gold', '18K')]: String(Math.round(base * 0.75)),
      [keyOf('gold', '14K')]: String(Math.round(base * 0.585)),
    }));
  };

  const save = async () => {
    if (!changed.length) return toast('Nothing changed');
    setSaving(true);
    try {
      const rates = changed.map((k) => {
        const [metal, purity] = k.split(':');
        return { metal, purity, ratePerGram: Number(values[k]) };
      });
      const d = await metalRateAPI.update(rates);
      toast.success(d.message || 'Rates saved');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const recalc = async () => {
    try {
      const d = await metalRateAPI.recalculate();
      toast.success(d.message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Wrapper title="Gold & Metal Rates" subtitle="Today's per-gram rates — live-priced jewellery re-prices automatically when you save">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <FiClock className="w-4 h-4" />
          {updatedAt ? `Last updated ${new Date(updatedAt).toLocaleString('en-IN')}` : 'Not updated yet'}
        </div>
        <div className="flex gap-2">
          <button onClick={recalc} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <FiRefreshCw className="w-4 h-4" /> Re-price products
          </button>
          <button onClick={save} disabled={saving || !changed.length}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50">
            <FiSave className="w-4 h-4" /> {saving ? 'Saving…' : `Save${changed.length ? ` (${changed.length})` : ''}`}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => <div key={i} className="h-72 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-5">
          {Object.entries(PURITIES).map(([metal, purities]) => (
            <div key={metal} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${METAL_META[metal].swatch}`} />
              <div className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{METAL_META[metal].label}</h3>
                  {metal === 'gold' && (
                    <button onClick={fillFrom24K} className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline">
                      Auto-fill from 24K
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{METAL_META[metal].note}</p>
                <div className="space-y-3">
                  {purities.map((purity) => {
                    const k = keyOf(metal, purity);
                    const dirty = values[k] !== original[k];
                    return (
                      <div key={k} className="flex items-center gap-3">
                        <span className="w-14 text-sm font-semibold text-gray-700 dark:text-gray-200">{purity}</span>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                          <input type="number" min="0" value={values[k] ?? ''}
                            onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                            className={`w-full pl-7 pr-12 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400 ${dirty ? 'border-amber-400' : 'border-gray-200 dark:border-gray-700'}`} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">/ g</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-2 text-xs">
                  {purities.slice(0, 2).map((purity) => {
                    const r = Number(original[keyOf(metal, purity)]);
                    return (
                      <div key={purity} className="rounded-lg bg-amber-50/70 dark:bg-amber-500/10 px-3 py-2">
                        <p className="text-gray-500 dark:text-gray-400">{purity} · 10g</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{r ? formatINR(r * 10) : '—'}</p>
                      </div>
                    );
                  })}
                </div>
                {meta[keyOf(metal, purities[0])]?.updatedBy?.name && (
                  <p className="text-[11px] text-gray-400 mt-3">Updated by {meta[keyOf(metal, purities[0])].updatedBy.name}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 p-4 flex gap-3">
        <FiTrendingUp className="w-5 h-5 text-amber-700 dark:text-amber-300 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Products with <strong>“Live price from today's rate”</strong> turned on are priced as
          net weight × rate + making charges + stone charges + GST. Saving here updates all of them at once.
          Fixed-price products are not touched.
        </p>
      </div>
    </Wrapper>
  );
}
