import { FiAward, FiExternalLink, FiShield } from 'react-icons/fi';
import { METAL_LABEL, formatINR } from '../../utils/jewellery';

const fmtWeight = (g) => (g ? `${Number(g).toFixed(3).replace(/\.?0+$/, '')} g` : null);

/**
 * Product page block: metal / purity / weight / stones / certification, plus
 * the price breakup for pieces priced from the live gold rate.
 */
export default function JewellerySpecs({ product }) {
  const j = product?.jewellery;
  if (!j?.metal) return null;

  const specs = [
    { label: 'Metal', value: METAL_LABEL[j.metal] || j.metal },
    { label: 'Purity', value: j.purity },
    { label: 'Gross weight', value: fmtWeight(j.grossWeight) },
    { label: 'Net metal weight', value: fmtWeight(j.netWeight) },
    { label: 'Gemstone', value: j.gemstone && j.gemstone !== 'None' ? j.gemstone : null },
    { label: 'Stone weight', value: j.stoneWeight ? `${j.stoneWeight} ct` : null },
    { label: 'Diamond clarity', value: j.diamondClarity },
    { label: 'Diamond colour', value: j.diamondColor },
    { label: 'For', value: j.gender },
    { label: 'Occasion', value: j.occasion },
  ].filter((s) => s.value);

  const b = j.pricingMode === 'live' ? j.priceBreakup : null;

  return (
    <section className="mb-12 grid lg:grid-cols-[1.4fr_1fr] gap-6">
      <div className="rounded-2xl border border-amber-200/60 dark:border-amber-500/15 bg-white dark:bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Jewellery details</h2>
          <div className="flex flex-wrap gap-2">
            {j.hallmarked && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <FiAward className="w-3.5 h-3.5" /> BIS Hallmarked
              </span>
            )}
            {j.certification && j.certification !== 'BIS Hallmark' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <FiShield className="w-3.5 h-3.5" /> {j.certification} certified
              </span>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {specs.map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-amber-50/50 dark:bg-white/5 px-3.5 py-3">
              <dt className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
              <dd className="text-sm font-semibold text-gray-800 dark:text-gray-100 capitalize mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
        {(j.huid || j.certificateUrl) && (
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
            {j.huid && <span className="text-gray-600 dark:text-gray-300">HUID: <strong className="tracking-widest">{j.huid}</strong></span>}
            {j.certificateUrl && (
              <a href={j.certificateUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300 hover:underline">
                View certificate <FiExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {b ? (
        <div className="rounded-2xl border border-amber-200/60 dark:border-amber-500/15 bg-gradient-to-br from-amber-50 to-white dark:from-amber-500/10 dark:to-transparent p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Price breakup</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Based on today's {j.purity} rate of {formatINR(b.rateUsed)}/g
          </p>
          <div className="mt-5 space-y-2.5 text-sm">
            {[
              [`${METAL_LABEL[j.metal] || 'Metal'} (${fmtWeight(j.netWeight)})`, b.metalValue],
              ['Making charges', b.makingCharges],
              ...(b.stoneCharges ? [['Stone charges', b.stoneCharges]] : []),
              [`GST (${j.gstPercent ?? 3}%)`, b.gst],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>{k}</span><span>{formatINR(v)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 mt-1 border-t border-amber-200 dark:border-amber-500/20 font-semibold text-gray-900 dark:text-gray-100">
              <span>Total</span><span>{formatINR(b.total)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200/60 dark:border-amber-500/15 bg-gradient-to-br from-amber-50 to-white dark:from-amber-500/10 dark:to-transparent p-6 flex flex-col justify-center">
          <FiShield className="w-6 h-6 text-amber-700 dark:text-amber-300 mb-3" />
          <p className="font-semibold text-gray-900 dark:text-gray-100">Buy with confidence</p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 mt-2 space-y-1.5">
            <li>• Purity as stated, {j.hallmarked ? 'hallmarked by BIS' : 'tested in-house'}</li>
            <li>• Insured shipping in tamper-proof packaging</li>
            <li>• Invoice with weight & purity details</li>
          </ul>
        </div>
      )}
    </section>
  );
}
