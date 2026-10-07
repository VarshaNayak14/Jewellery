import { useEffect, useMemo, useState } from 'react';
import { FiAward, FiTrendingUp } from 'react-icons/fi';
import { metalRateAPI } from '../../services/api';
import ToggleSwitch from '../common/ToggleSwitch';
import {
  METALS, PURITIES, GEMSTONES, CERTIFICATIONS, OCCASIONS,
  rateMapFrom, computeBreakup, formatINR,
} from '../../utils/jewellery';

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100';
const labelCls = 'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block';

const Field = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className={labelCls}>{label}</label>
    {children}
  </div>
);

/**
 * "Jewellery Details" block for the seller and admin product forms.
 * `value` is the jewellery form state; `onChange` receives the next state.
 * In live-price mode the computed total is pushed through `onPrice` so the
 * parent form's Price field follows today's rate.
 */
export default function JewelleryFields({ value, onChange, onPrice }) {
  const [rates, setRates] = useState([]);
  const j = value;

  useEffect(() => {
    metalRateAPI.getAll().then((d) => setRates(d.rates || [])).catch(() => {});
  }, []);

  const rateMap = useMemo(() => rateMapFrom(rates), [rates]);
  const rateMetal = METALS.find((m) => m.value === j.metal)?.rateMetal;
  const purityOptions = rateMetal ? PURITIES[rateMetal] : [];
  const breakup = computeBreakup(j, rateMap);
  const isLive = j.pricingMode === 'live';

  useEffect(() => {
    if (isLive && breakup && onPrice) onPrice(breakup.total);
  }, [isLive, breakup?.total]);

  const set = (key) => (e) => onChange({ ...j, [key]: e.target.value });
  const setMetal = (e) => {
    const metal = e.target.value;
    const rm = METALS.find((m) => m.value === metal)?.rateMetal;
    const purities = rm ? PURITIES[rm] : [];
    onChange({
      ...j,
      metal,
      purity: purities.includes(j.purity) ? j.purity : (purities[1] || purities[0] || ''),
      pricingMode: rm ? j.pricingMode : 'fixed',
    });
  };

  return (
    <div className="sm:col-span-2 rounded-2xl border border-amber-200/70 dark:border-amber-500/20 bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-500/5 dark:to-gray-900 p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center">
            <FiAward className="w-4 h-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Jewellery Details</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Metal, weight, stones & certification</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Metal">
          <select value={j.metal} onChange={setMetal} className={inputCls}>
            <option value="">-- Not jewellery --</option>
            {METALS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Purity">
          {purityOptions.length ? (
            <select value={j.purity} onChange={set('purity')} className={inputCls}>
              {purityOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : (
            <input value={j.purity} onChange={set('purity')} placeholder="e.g. Gold plated" className={inputCls} />
          )}
        </Field>
        <Field label="For">
          <select value={j.gender} onChange={set('gender')} className={inputCls}>
            <option value="">--</option>
            <option value="women">Women</option>
            <option value="men">Men</option>
            <option value="kids">Kids</option>
            <option value="unisex">Unisex</option>
          </select>
        </Field>

        <Field label="Gross Weight (g)">
          <input type="number" step="0.001" min="0" value={j.grossWeight} onChange={set('grossWeight')} placeholder="5.250" className={inputCls} />
        </Field>
        <Field label="Net Metal Weight (g)">
          <input type="number" step="0.001" min="0" value={j.netWeight} onChange={set('netWeight')} placeholder="4.800" className={inputCls} />
        </Field>
        <Field label="Stone Weight (ct)">
          <input type="number" step="0.01" min="0" value={j.stoneWeight} onChange={set('stoneWeight')} placeholder="0.25" className={inputCls} />
        </Field>

        <Field label="Gemstone">
          <select value={j.gemstone} onChange={set('gemstone')} className={inputCls}>
            <option value="">--</option>
            {GEMSTONES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
        {/diamond|moissanite/i.test(j.gemstone) ? (
          <>
            <Field label="Diamond Clarity">
              <input value={j.diamondClarity} onChange={set('diamondClarity')} placeholder="VVS1 / VS2 / SI1" className={inputCls} />
            </Field>
            <Field label="Diamond Colour">
              <input value={j.diamondColor} onChange={set('diamondColor')} placeholder="E-F / G-H" className={inputCls} />
            </Field>
          </>
        ) : (
          <Field label="Occasion" className="sm:col-span-2">
            <select value={j.occasion} onChange={set('occasion')} className={inputCls}>
              <option value="">--</option>
              {OCCASIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        )}
        {/diamond|moissanite/i.test(j.gemstone) && (
          <Field label="Occasion" className="sm:col-span-3">
            <select value={j.occasion} onChange={set('occasion')} className={inputCls}>
              <option value="">--</option>
              {OCCASIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        )}

        <Field label="Making Charge">
          <div className="flex gap-2">
            <input type="number" step="0.01" min="0" value={j.makingCharge} onChange={set('makingCharge')} placeholder="12" className={inputCls} />
            <select value={j.makingChargeType} onChange={set('makingChargeType')} className={`${inputCls} !w-28`}>
              <option value="percent">%</option>
              <option value="per_gram">₹/g</option>
              <option value="fixed">₹ flat</option>
            </select>
          </div>
        </Field>
        <Field label="Stone Charges (₹)">
          <input type="number" min="0" value={j.stoneCharges} onChange={set('stoneCharges')} placeholder="0" className={inputCls} />
        </Field>
        <Field label="GST %">
          <input type="number" step="0.01" min="0" value={j.gstPercent} onChange={set('gstPercent')} placeholder="3" className={inputCls} />
        </Field>

        <Field label="Certification">
          <select value={j.certification} onChange={set('certification')} className={inputCls}>
            <option value="">--</option>
            {CERTIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="HUID (6 chars)">
          <input value={j.huid} onChange={(e) => onChange({ ...j, huid: e.target.value.toUpperCase().slice(0, 6) })} placeholder="AB12CD" className={`${inputCls} uppercase tracking-widest`} />
        </Field>
        <Field label="Certificate Link">
          <input value={j.certificateUrl} onChange={set('certificateUrl')} placeholder="https://..." className={inputCls} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4">
        <ToggleSwitch checked={!!j.hallmarked} onChange={(v) => onChange({ ...j, hallmarked: v })} label="BIS Hallmarked" color="bg-amber-600" />
        <ToggleSwitch
          checked={isLive}
          onChange={(v) => onChange({ ...j, pricingMode: v ? 'live' : 'fixed' })}
          label="Live price from today's rate"
          color="bg-amber-600"
        />
      </div>

      {rateMetal && (
        <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-white dark:bg-gray-900 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">
            <FiTrendingUp className="w-3.5 h-3.5" />
            {rateMap[`${rateMetal}:${j.purity}`]
              ? `Today's ${j.purity} ${rateMetal} rate: ${formatINR(rateMap[`${rateMetal}:${j.purity}`])}/g`
              : `No rate saved for ${j.purity || 'this purity'} ${rateMetal} yet`}
          </div>
          {breakup ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {[
                ['Metal', breakup.metalValue],
                ['Making', breakup.makingCharges],
                ['Stones', breakup.stoneCharges],
                ['GST', breakup.gst],
                ['Total', breakup.total],
              ].map(([k, v]) => (
                <div key={k} className={`rounded-lg px-2.5 py-2 ${k === 'Total' ? 'bg-amber-600 text-white' : 'bg-amber-50 dark:bg-amber-500/10 text-gray-700 dark:text-gray-200'}`}>
                  <p className="opacity-75">{k}</p>
                  <p className="font-semibold">{formatINR(v)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">Enter net weight to see the price breakup.</p>
          )}
          {isLive && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
              Price is set automatically and updates whenever Admin changes the {rateMetal} rate.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
