import { useEffect, useState } from 'react';
import { FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { locationAPI } from '../../services/api';
import { INDIA_STATES } from '../../data/indiaLocations';

// Customer delivery address with PIN code verification (India Post, via
// GET /location/check/:pincode). Entering the 6-digit PIN fills in district
// and state; a state / district that doesn't match the PIN is flagged here
// and rejected again by the server. `onChange` must accept an updater
// function too (a React state setter does).

export const EMPTY_ADDRESS = { name: '', phone: '', houseNo: '', area: '', city: '', district: '', state: '', pincode: '' };

// India Post spells a few states differently from our list.
const ALIASES = { chattisgarh: 'chhattisgarh', orissa: 'odisha', pondicherry: 'puducherry', uttaranchal: 'uttarakhand', nctofdelhi: 'delhi' };
const norm = (s) => {
  const key = String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');
  return ALIASES[key] || key;
};
const toListedState = (s) => INDIA_STATES.find(x => norm(x) === norm(s)) || s;

// Old saved addresses only have a one-line `street`.
export const fromSavedAddress = (a = {}) => ({
  ...EMPTY_ADDRESS,
  ...a,
  houseNo: a.houseNo ?? (a.area ? '' : a.street || ''),
  area: a.area ?? '',
  district: a.district || '',
});

export const withStreet = (a) => ({ ...a, street: [a.houseNo, a.area].filter(Boolean).join(', ') });

// Returns an error message, or '' when the address is complete and matches its PIN.
export const validateAddress = (a, pinInfo) => {
  const labels = { name: 'full name', phone: 'mobile number', houseNo: 'house / shop no.', area: 'area / locality', city: 'city', district: 'district', state: 'state', pincode: 'PIN code' };
  for (const key of Object.keys(labels)) {
    if (!String(a[key] || '').trim()) return `Please enter ${labels[key]}`;
  }
  if (!/^[6-9]\d{9}$/.test(String(a.phone).replace(/\D/g, '').slice(-10))) return 'Enter a valid 10-digit mobile number';
  if (!/^[1-9]\d{5}$/.test(a.pincode)) return 'Enter a valid 6-digit PIN code';
  return pinMismatch(a, pinInfo);
};

const pinMismatch = (a, pinInfo) => {
  if (!pinInfo || pinInfo.pincode !== a.pincode) return '';
  if (!pinInfo.valid) return `PIN code ${a.pincode} does not exist. Please check it.`;
  if (a.state && !pinInfo.states.some(s => norm(s) === norm(a.state))) return 'PIN Code does not match the selected state.';
  if (a.district && !pinInfo.districts.some(d => norm(d) === norm(a.district))) return 'PIN Code does not match the selected district.';
  return '';
};

const inputCls = 'input-field text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

export default function AddressFields({ value, onChange, onPinInfo }) {
  const [pinInfo, setPinInfo] = useState(null);
  const [checking, setChecking] = useState(false);
  const set = (key, v) => onChange({ ...value, [key]: v });

  // Look the PIN up as soon as it has 6 digits; fill district + state from it.
  useEffect(() => {
    const pin = value.pincode;
    if (!/^[1-9]\d{5}$/.test(pin || '')) { setPinInfo(null); onPinInfo?.(null); return; }
    if (pinInfo?.pincode === pin) return;
    let cancelled = false;
    setChecking(true);
    locationAPI.checkPincode(pin)
      .then(d => {
        if (cancelled) return;
        const info = { ...d, pincode: pin, valid: d.valid !== false };
        setPinInfo(info);
        onPinInfo?.(info);
        // Functional update: the customer may have typed elsewhere meanwhile.
        if (info.valid) {
          onChange(prev => ({
            ...prev,
            state: toListedState(info.state),
            district: info.districts.some(x => norm(x) === norm(prev.district)) ? prev.district : info.district,
            city: prev.city || info.district,
          }));
        }
      })
      // Service unreachable: let the customer continue, the server re-checks.
      .catch(() => { if (!cancelled) { setPinInfo(null); onPinInfo?.(null); } })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.pincode]);

  const mismatch = pinMismatch(value, pinInfo);
  const districtOptions = pinInfo?.valid && pinInfo.pincode === value.pincode ? pinInfo.districts : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelCls}>Full Name</label>
        <input value={value.name} onChange={e => set('name', e.target.value)} placeholder="Your full name" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Mobile Number</label>
        <input value={value.phone} onChange={e => set('phone', e.target.value.replace(/[^\d+ ]/g, ''))} placeholder="10-digit mobile" inputMode="tel" maxLength={14} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>House / Shop No.</label>
        <input value={value.houseNo} onChange={e => set('houseNo', e.target.value)} placeholder="e.g. 12-B, Shop 4" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Area / Locality</label>
        <input value={value.area} onChange={e => set('area', e.target.value)} placeholder="Street, colony, landmark" list="pin-post-offices" className={inputCls} />
        {pinInfo?.valid && <datalist id="pin-post-offices">{pinInfo.postOffices.map(p => <option key={p} value={p} />)}</datalist>}
      </div>

      <div className="sm:col-span-2">
        <label className={labelCls}>6-digit PIN Code</label>
        <div className="relative">
          <input value={value.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="e.g. 452001" inputMode="numeric" maxLength={6}
            className={`${inputCls} pr-10 ${mismatch ? 'border-red-400 dark:border-red-500' : ''}`} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {checking ? <FiLoader className="w-4 h-4 animate-spin text-gray-400" />
              : pinInfo?.valid && !mismatch ? <FiCheckCircle className="w-4 h-4 text-green-600" />
              : mismatch ? <FiAlertCircle className="w-4 h-4 text-red-500" /> : null}
          </span>
        </div>
        {pinInfo?.valid && !mismatch && (
          <p className="mt-1.5 text-xs text-green-700 dark:text-green-400">
            {value.pincode} → {pinInfo.district}, {toListedState(pinInfo.state)}
            {pinInfo.postOffices?.length > 0 && <span className="text-gray-500 dark:text-gray-400"> · Post office: {pinInfo.postOffices.slice(0, 3).join(', ')}{pinInfo.postOffices.length > 3 ? '…' : ''}</span>}
          </p>
        )}
        {mismatch && <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">❌ {mismatch}</p>}
      </div>

      <div>
        <label className={labelCls}>City</label>
        <input value={value.city} onChange={e => set('city', e.target.value)} placeholder="City / town" list="pin-cities" className={inputCls} />
        {pinInfo?.valid && <datalist id="pin-cities">{pinInfo.cities.map(c => <option key={c} value={c} />)}</datalist>}
      </div>
      <div>
        <label className={labelCls}>District</label>
        {districtOptions && districtOptions.length > 1 ? (
          <select value={value.district} onChange={e => set('district', e.target.value)} className={inputCls}>
            {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : (
          <input value={value.district} onChange={e => set('district', e.target.value)} placeholder="District" className={inputCls} />
        )}
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>State</label>
        <select value={value.state} onChange={e => set('state', e.target.value)}
          className={`${inputCls} ${mismatch && mismatch.includes('state') ? 'border-red-400 dark:border-red-500' : ''}`}>
          <option value="">Select state</option>
          {(value.state && !INDIA_STATES.includes(value.state) ? [value.state, ...INDIA_STATES] : INDIA_STATES).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}
