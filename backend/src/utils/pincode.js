// PIN code lookup via India Post's public API (api.postalpincode.in — no key
// needed). Used to check that a customer's address PIN really belongs to the
// district / state they entered. Results are cached for a day.

const CACHE_TTL = 24 * 60 * 60 * 1000;
const cache = new Map();

// India Post spells a few states differently from our state list.
const ALIASES = {
  chattisgarh: 'chhattisgarh',
  orissa: 'odisha',
  pondicherry: 'puducherry',
  uttaranchal: 'uttarakhand',
  delhi: 'delhi',
  nctofdelhi: 'delhi',
};
const norm = (s) => {
  const key = String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');
  return ALIASES[key] || key;
};

// -> { valid: true, pincode, state, district, districts, postOffices, cities }
//  | { valid: false, pincode }       (PIN does not exist)
//  | null                            (India Post unreachable — can't tell)
async function lookupPincode(pincode) {
  const pin = String(pincode || '').trim();
  if (!/^[1-9]\d{5}$/.test(pin)) return { valid: false, pincode: pin };

  const hit = cache.get(pin);
  if (hit && hit.expires > Date.now()) return hit.data;

  let json;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    json = await res.json();
  } catch {
    return null;
  }

  const offices = json?.[0]?.Status === 'Success' ? (json[0].PostOffice || []) : [];
  let data;
  if (!offices.length) {
    data = { valid: false, pincode: pin };
  } else {
    const uniq = (list) => [...new Set(list.map(v => String(v || '').trim()).filter(Boolean))];
    const districts = uniq(offices.map(o => o.District));
    const states = uniq(offices.map(o => o.State));
    data = {
      valid: true,
      pincode: pin,
      state: states[0],
      states,
      district: districts[0],
      districts,
      postOffices: uniq(offices.map(o => o.Name)),
      cities: uniq([...offices.map(o => o.Block), ...offices.map(o => o.Division), ...districts])
        .filter(c => c.toUpperCase() !== 'NA'),
    };
  }
  cache.set(pin, { data, expires: Date.now() + CACHE_TTL });
  return data;
}

// Checks an address's PIN against its state / district.
// -> { ok: true, info } | { ok: false, message }
// If India Post can't be reached the address is allowed (info: null) — a
// lookup outage must not stop customers from ordering.
async function verifyAddress(address = {}) {
  const pin = String(address.pincode || '').trim();
  if (!/^[1-9]\d{5}$/.test(pin)) return { ok: false, message: 'Enter a valid 6-digit PIN code.' };
  const info = await lookupPincode(pin);
  if (!info) return { ok: true, info: null };
  if (!info.valid) return { ok: false, message: `PIN code ${pin} does not exist. Please check it.` };
  if (address.state && !info.states.some(s => norm(s) === norm(address.state))) {
    return { ok: false, message: 'PIN Code does not match the selected state.' };
  }
  if (address.district && !info.districts.some(d => norm(d) === norm(address.district))) {
    return { ok: false, message: 'PIN Code does not match the selected district.' };
  }
  return { ok: true, info };
}

module.exports = { lookupPincode, verifyAddress };
