// ─────────────────────────────────────────────────────────────────────────
// Persisted "current location" for the JustDial-style nearby-business flow.
// Stored in localStorage so it survives refreshes/tabs, and every page that
// cares about location (Navbar location bar, /nearby directory) reads from
// the same place instead of each maintaining its own copy.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'gk_location';
const CHANGE_EVENT = 'gk-location-change';

// Shape: { state, district, tehsil, label } — label is what's shown in the UI
// (e.g. "Indore, Madhya Pradesh"). All fields optional except when present
// they must be non-empty strings.
export const getSavedLocation = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveLocation = (location) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    // Notify any other mounted component (e.g. Navbar + BusinessDirectory
    // open at once) that the location changed, since storage events don't
    // fire in the same tab that made the change.
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: location }));
  } catch {
    // localStorage unavailable (e.g. private browsing) — fail silently,
    // the picker will just need to be reopened on next use.
  }
};

export const clearSavedLocation = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: null }));
  } catch {
    // ignore
  }
};

export const onLocationChange = (callback) => {
  const handler = (e) => callback(e.detail);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
};

export const formatLocationLabel = ({ tehsil, district, state } = {}) =>
  [tehsil, district, state].filter(Boolean).join(', ') || 'Select Location';

// ─────────────────────────────────────────────────────────────────────────
// Auto-detect via browser GPS + reverse geocoding (OpenStreetMap Nominatim,
// free/no key). Shared by the silent app-startup attempt (useAutoDetectLocation)
// and the "Use My Current Location" button in LocationPickerModal, so both
// stay in sync and there's only one place to fix if the geocoding logic
// ever needs to change.
//
// `knownStates` should be the list from businessAPI.getStates() — we only
// ever save a location that actually matches a state with sellers on file,
// so the plan-visibility filtering on the backend always has something real
// to compare against.
export const reverseGeocodeToLocation = async (latitude, longitude, knownStates, getDistricts, getTehsils) => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
    { headers: { Accept: 'application/json' } }
  );
  const data = await res.json();
  const addr = data?.address || {};
  const detectedState = addr.state || '';
  const detectedDistrict = addr.state_district || addr.county || addr.city_district || '';
  const detectedTehsil = addr.suburb || addr.town || addr.city || addr.village || '';

  if (!detectedState) return null;

  const matchedState = knownStates.find(s => s.toLowerCase() === detectedState.toLowerCase());
  if (!matchedState) return null;

  let matchedDistrict = '';
  let matchedTehsil = '';
  const districtList = await getDistricts(matchedState);
  matchedDistrict = districtList.find(d => d.toLowerCase() === detectedDistrict.toLowerCase()) || '';
  if (matchedDistrict) {
    const tehsilList = await getTehsils(matchedDistrict);
    matchedTehsil = tehsilList.find(t => t.toLowerCase() === detectedTehsil.toLowerCase()) || '';
  }

  return {
    state: matchedState,
    district: matchedDistrict,
    tehsil: matchedTehsil,
    label: [matchedTehsil, matchedDistrict, matchedState].filter(Boolean).join(', '),
  };
};

// Wraps navigator.geolocation.getCurrentPosition in a Promise. Rejects with
// a short reason string on denial/timeout/unsupported browsers, so callers
// can decide what to show without re-implementing the geolocation callback.
export const getCurrentCoords = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) { reject('unsupported'); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => resolve(pos.coords),
    (err) => reject(err.code === err.PERMISSION_DENIED ? 'denied' : 'failed'),
    { enableHighAccuracy: false, timeout: 10000 }
  );
});

// One-time-per-browser flag so we only ever silently prompt for GPS
// permission once on first visit — if they deny it, we don't nag on every
// reload afterwards. The manual picker (Navbar "Select Location" / the
// /nearby fallback banner) is always available regardless of this flag.
const AUTO_ATTEMPT_KEY = 'gk_location_auto_attempted';
export const hasAttemptedAutoDetect = () => {
  try { return localStorage.getItem(AUTO_ATTEMPT_KEY) === '1'; } catch { return true; }
};
export const markAutoDetectAttempted = () => {
  try { localStorage.setItem(AUTO_ATTEMPT_KEY, '1'); } catch { /* ignore */ }
};