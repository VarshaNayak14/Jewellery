import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMapPin, FiX, FiCrosshair, FiLoader, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { businessAPI } from '../../services/api';
import { saveLocation } from '../../utils/location';

// ─────────────────────────────────────────────────────────────────────────
// JustDial-style "set your location" modal.
//   - "Detect my location" uses the browser's GPS (navigator.geolocation)
//     then reverse-geocodes the coordinates via OpenStreetMap Nominatim
//     (free, no API key) to get a state/district, which is then matched
//     against the states/districts that actually have sellers on file.
//   - Manual picker below it: cascading State → District → Tehsil selects,
//     same data source as the /nearby page, so results always line up.
// Selecting either way saves to localStorage (see utils/location.js) and
// every page reading that value (Navbar badge, /nearby directory) updates.
// ─────────────────────────────────────────────────────────────────────────
export default function LocationPickerModal({ isOpen, onClose, onApply }) {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [tehsils, setTehsils] = useState([]);
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [tehsil, setTehsil] = useState('');

  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState('');
  const [detectedLabel, setDetectedLabel] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDetectError('');
    businessAPI.getStates().then(d => setStates(d.data || [])).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    setDistricts([]); setDistrict(''); setTehsils([]); setTehsil('');
    if (state) businessAPI.getDistricts(state).then(d => setDistricts(d.data || [])).catch(() => {});
  }, [state]);

  useEffect(() => {
    setTehsils([]); setTehsil('');
    if (district) businessAPI.getTehsils(district).then(d => setTehsils(d.data || [])).catch(() => {});
  }, [district]);

  const applyAndClose = (loc) => {
    saveLocation(loc);
    onApply?.(loc);
    onClose?.();
  };

  const handleManualApply = () => {
    if (!state) return;
    applyAndClose({
      state, district, tehsil,
      label: [tehsil, district, state].filter(Boolean).join(', '),
    });
  };

  // ── "Use my current location" — GPS + reverse geocode ──────────────────
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setDetectError('Location detection is not supported on this browser. Please choose manually below.');
      return;
    }
    setDetecting(true);
    setDetectError('');
    setDetectedLabel('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: 'application/json' } }
          );
          const data = await res.json();
          const addr = data?.address || {};
          const detectedState = addr.state || '';
          const detectedDistrict = addr.state_district || addr.county || addr.city_district || '';
          const detectedTehsil = addr.suburb || addr.town || addr.city || addr.village || '';

          if (!detectedState) {
            setDetectError("Couldn't figure out your state from GPS. Please choose manually below.");
            setDetecting(false);
            return;
          }

          // Match against states that actually have sellers, so the search
          // dropdowns below line up (case-insensitive).
          const stateList = states.length ? states : (await businessAPI.getStates()).data || [];
          const matchedState = stateList.find(s => s.toLowerCase() === detectedState.toLowerCase());

          if (!matchedState) {
            setDetectError(`We detected "${detectedState}", but no sellers are listed there yet. Please choose manually below.`);
            setDetecting(false);
            return;
          }

          setState(matchedState);
          const districtList = (await businessAPI.getDistricts(matchedState)).data || [];
          const matchedDistrict = districtList.find(d => d.toLowerCase() === detectedDistrict.toLowerCase());

          let matchedTehsil = '';
          if (matchedDistrict) {
            setDistrict(matchedDistrict);
            const tehsilList = (await businessAPI.getTehsils(matchedDistrict)).data || [];
            matchedTehsil = tehsilList.find(t => t.toLowerCase() === detectedTehsil.toLowerCase()) || '';
            if (matchedTehsil) setTehsil(matchedTehsil);
          }

          setDetectedLabel([matchedTehsil, matchedDistrict, matchedState].filter(Boolean).join(', '));
          setDetecting(false);
        } catch {
          setDetectError('Could not detect your location right now. Please choose manually below.');
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setDetectError('Location permission denied. Please choose manually below, or allow location access and try again.');
        } else {
          setDetectError('Could not detect your location. Please choose manually below.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const useDetected = () => {
    applyAndClose({ state, district, tehsil, label: detectedLabel });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <FiMapPin className="w-5 h-5 text-blue-600" /> Set Your Location
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Detect via GPS */}
              <div>
                <button
                  onClick={detectLocation}
                  disabled={detecting}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
                >
                  {detecting ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiCrosshair className="w-4 h-4" />}
                  {detecting ? 'Detecting your location...' : 'Use My Current Location'}
                </button>

                {detectError && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                    <FiAlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {detectError}
                  </p>
                )}

                {detectedLabel && !detecting && (
                  <div className="mt-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl p-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-green-800 dark:text-green-400 flex items-center gap-1.5 min-w-0">
                      <FiCheck className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Detected: <b>{detectedLabel}</b></span>
                    </p>
                    <button onClick={useDetected}
                      className="flex-shrink-0 text-xs font-bold text-green-700 dark:text-green-400 hover:underline">
                      Use this
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1" />
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">OR CHOOSE MANUALLY</span>
                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1" />
              </div>

              {/* Manual cascading picker */}
              <div className="space-y-2">
                <select value={state} onChange={e => setState(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">Select State</option>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={district} onChange={e => setDistrict(e.target.value)} disabled={!state}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:text-gray-400 dark:disabled:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">Select District (optional)</option>
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={tehsil} onChange={e => setTehsil(e.target.value)} disabled={!district}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:text-gray-400 dark:disabled:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">Select Tehsil (optional)</option>
                  {tehsils.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <button
                onClick={handleManualApply}
                disabled={!state}
                className="w-full bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl transition-colors"
              >
                Confirm Location
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}