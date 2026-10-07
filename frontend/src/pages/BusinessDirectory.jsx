import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiSearch, FiMapPin, FiStar, FiPhone, FiX, FiCheckCircle, FiCrosshair, FiArrowRight, FiAward } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { businessAPI } from '../services/api';
import { toWhatsappNumber } from '../utils/helpers';
import { getSavedLocation, saveLocation, clearSavedLocation } from '../utils/location';
import { isVideoBanner, shopLogoFor } from '../components/common/ShopCover';
import { useTheme } from '../context/ThemeContext';
import './BusinessDirectory.css';

export default function BusinessDirectory() {
  // This page has NO search box of its own any more — the navbar search is the
  // single search entry point site-wide (it lands on /search). If someone
  // arrives here with ?q= / ?search= in the URL we still honour it and show it
  // as a removable chip, so nothing breaks for old links.
  const [params, setParams] = useSearchParams();
  const search = params.get('q') || params.get('search') || '';
  const clearSearch = () => {
    const next = new URLSearchParams(params);
    next.delete('q'); next.delete('search');
    setParams(next);
  };
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Location filter — State → District → Tehsil, cascading. A seller only
  // shows up here if their subscription plan's reach covers the location
  // picked (India-wide plans always show, state plans show for any district/
  // tehsil in their state, etc. — enforced server-side).
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [tehsils, setTehsils] = useState([]);
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [tehsil, setTehsil] = useState('');

  // On first load, auto-apply whatever location the person already set via
  // the Navbar's "Select Location" picker (or a previous visit to this page)
  // instead of making them re-pick it every time — this is what makes the
  // location feel "sticky" across the site, JustDial-style. The same
  // restore cascade also drives the "Detect my location" (GPS) button below
  // — it just feeds a freshly-geocoded location into savedLocationRef
  // instead of one read from storage on mount.
  const savedLocationRef = useRef(getSavedLocation());
  const restoringRef = useRef(!!savedLocationRef.current?.state);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // GPS-derived names ("Madhya Pradesh" from OpenStreetMap) won't always
  // match the DB's stored casing exactly, so match case-insensitively but
  // still select the list's own casing (so the <select> shows it correctly
  // and later searches use the value sellers actually registered with).
  const findMatch = (list, value) => list.find(item => item.toLowerCase() === String(value || '').toLowerCase());

  useEffect(() => {
    businessAPI.getCities().then(d => setCities(d.data || [])).catch(() => {});
    businessAPI.getCategoryCounts().then(d => setCategories(d.data || [])).catch(() => {});
    businessAPI.getStates().then(d => {
      const list = d.data || [];
      setStates(list);
      const saved = savedLocationRef.current;
      const match = saved?.state && findMatch(list, saved.state);
      if (match) {
        setState(match); // kicks off the district-restore effect below
      } else {
        restoringRef.current = false;
      }
    }).catch(() => { restoringRef.current = false; });
  }, []);

  // Reset the narrower selects whenever a broader one changes — but not
  // while we're still restoring a previously-saved (or GPS-detected) location.
  useEffect(() => {
    if (!restoringRef.current) { setDistricts([]); setDistrict(''); setTehsils([]); setTehsil(''); }
    if (state) {
      businessAPI.getDistricts(state).then(d => {
        const list = d.data || [];
        setDistricts(list);
        const saved = savedLocationRef.current;
        const match = restoringRef.current && saved?.district && findMatch(list, saved.district);
        if (match) {
          setDistrict(match); // kicks off the tehsil-restore effect below
        } else {
          restoringRef.current = false;
        }
      }).catch(() => { restoringRef.current = false; });
    }
  }, [state]);

  useEffect(() => {
    if (!restoringRef.current) { setTehsils([]); setTehsil(''); }
    if (district) {
      businessAPI.getTehsils(district).then(d => {
        const list = d.data || [];
        setTehsils(list);
        const saved = savedLocationRef.current;
        const match = restoringRef.current && saved?.tehsil && findMatch(list, saved.tehsil);
        if (match) setTehsil(match);
        restoringRef.current = false;
      }).catch(() => { restoringRef.current = false; });
    } else {
      restoringRef.current = false;
    }
  }, [district]);

  // "Detect my location" — browser GPS + free reverse geocoding (OpenStreetMap
  // Nominatim, no API key needed). Feeds the detected state/district/tehsil
  // into the exact same restore cascade above, so partial matches (e.g. state
  // found but district name doesn't line up with what's on file) degrade
  // gracefully instead of failing outright.
  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { Accept: 'application/json' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const detectedState = addr.state || '';
          const detectedDistrict = addr.state_district || addr.county || addr.city_district || '';
          const detectedTehsil = addr.suburb || addr.town || addr.city_district || addr.village || '';

          if (!detectedState) {
            toast.error('Could not determine your location. Please select manually.');
            return;
          }

          const match = findMatch(states, detectedState);
          if (!match) {
            toast.error(`No sellers found near "${detectedState}" yet. Please select manually.`);
            return;
          }

          savedLocationRef.current = { state: detectedState, district: detectedDistrict, tehsil: detectedTehsil };
          restoringRef.current = true;
          setState(match);
          toast.success(`Location set to ${[detectedDistrict, detectedState].filter(Boolean).join(', ')}`);
        } catch {
          toast.error('Could not detect your location. Please select manually.');
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setDetectingLocation(false);
        toast.error(err.code === 1 ? 'Location permission denied' : 'Could not get your current location');
      },
      { timeout: 10000 }
    );
  };

  // Whenever the person changes location here directly, remember it too, so
  // the Navbar badge and any other page reading it stay in sync.
  useEffect(() => {
    if (restoringRef.current) return; // don't re-save while still restoring
    if (state) {
      saveLocation({ state, district, tehsil, label: [tehsil, district, state].filter(Boolean).join(', ') });
    }
  }, [state, district, tehsil]);

  const fetchResults = useCallback(() => {
    // Wait for the saved state/district/tehsil cascade to finish. Otherwise
    // the page briefly loads the broad list before replacing it with the
    // plan-scoped location results.
    if (restoringRef.current) return;
    setLoading(true);
    const params = { page, limit: 12 };
    if (search) params.search = search;
    if (category) params.category = category;
    if (city) params.city = city;
    if (state) params.state = state;
    if (district) params.district = district;
    if (tehsil) params.tehsil = tehsil;

    // No fallback to other areas: a shop only shows where its plan reaches.
    businessAPI.search(params)
      .then(d => {
        setBusinesses(d.data || []);
        setPages(d.pagination?.pages || 1);
      })
      .catch(() => setBusinesses([]))
      .finally(() => setLoading(false));
  }, [search, category, city, state, district, tehsil, page]);

  useEffect(() => { fetchResults(); }, [fetchResults]);
  useEffect(() => { setPage(1); }, [search, category, city, state, district, tehsil]);

  const hasLocationFilter = !!(state || district || tehsil);
  const clearLocation = () => { setState(''); setDistrict(''); setTehsil(''); clearSavedLocation(); };
  const clearAll = () => { clearSearch(); setCategory(''); setCity(''); clearLocation(); };
  const hasAnyFilter = search || category || city || hasLocationFilter;

  return (
    <main className="min-h-screen jewel-dir">
      {/* Hero */}
      <section className="jewel-dir__hero">
        <img src="/jewelry/campaign.jpg" alt="" className="jewel-dir__hero-img" />
        <div className="jewel-dir__hero-shade" />
        <div className="relative max-w-6xl mx-auto px-4 pt-14 pb-24 md:pt-20 md:pb-28">
          <span className="jewel-dir__eyebrow">Jewellers near you</span>
          <h1 className="jewel-dir__title">Visit a <em>trusted jeweller</em> nearby.</h1>
          <p className="jewel-dir__sub">
            Hallmarked gold, certified diamonds and bridal collections from verified showrooms in your area —
            see their designs, then call or WhatsApp them directly.
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-7">
            <button onClick={detectLocation} disabled={detectingLocation} className="jewel-dir__cta">
              {detectingLocation
                ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <FiCrosshair className="w-4 h-4" />}
              {detectingLocation ? 'Detecting…' : 'Use my current location'}
            </button>
            {hasLocationFilter && (
              <span className="jewel-dir__loc">
                <FiMapPin className="w-3.5 h-3.5" />
                {[tehsil, district, state].filter(Boolean).join(', ')}
                <button onClick={clearLocation} aria-label="Clear location"><FiX className="w-3.5 h-3.5" /></button>
              </span>
            )}
            {search && (
              <button onClick={clearSearch} className="jewel-dir__loc">
                <FiSearch className="w-3.5 h-3.5" /> “{search}” <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 -mt-12 relative z-10 pb-16">
        {/* Filter bar */}
        <div className="jewel-dir__filters">
          <FilterSelect label="State" value={state} onChange={setState} options={states} placeholder="All states" />
          <FilterSelect label="District" value={district} onChange={setDistrict} options={districts} placeholder={state ? 'All districts' : 'Pick a state'} disabled={!state} />
          <FilterSelect label="Area / Tehsil" value={tehsil} onChange={setTehsil} options={tehsils} placeholder={district ? 'All areas' : 'Pick a district'} disabled={!district} />
          <FilterSelect label="City" value={city} onChange={setCity} options={cities} placeholder="All cities" />
          <FilterSelect label="Category" value={category} onChange={setCategory}
            options={categories.map((c) => ({ value: c.category, label: `${c.category} (${c.count})` }))} placeholder="All categories" />
          {hasAnyFilter && (
            <button onClick={clearAll} className="jewel-dir__clear">Clear all</button>
          )}
        </div>

        <div className="flex items-end justify-between gap-3 mt-10 mb-5">
          <div>
            <span className="sec-eyebrow">Showrooms</span>
            <h2 className="text-2xl font-semibold jewel-dir__ink">
              {loading ? 'Finding jewellers…' : `${businesses.length ? businesses.length : 'No'} jeweller${businesses.length === 1 ? '' : 's'}${hasLocationFilter ? ` in ${district || state}` : ' to explore'}`}
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 rounded-3xl jewel-dir__skeleton animate-pulse" />
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <div className="jewel-dir__empty">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center jewel-dir__empty-icon">
              <FiMapPin className="w-6 h-6" />
            </div>
            <p className="font-semibold jewel-dir__ink">
              {hasLocationFilter ? 'No jewellers listed in this area yet' : 'No jewellers found'}
            </p>
            <p className="text-sm jewel-dir__muted mt-1">
              {hasLocationFilter ? 'Try a wider area — pick only the state or district.' : 'Try another search or clear the filters.'}
            </p>
            <Link to="/seller/register" className="inline-block mt-5 text-sm font-semibold jewel-dir__link">Own a jewellery store? List it here →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map((b) => <BusinessCard key={b._id} business={b} />)}
          </div>
        )}

        {pages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`jewel-dir__page ${p === page ? 'is-active' : ''}`}>{p}</button>
            ))}
          </div>
        )}

        {/* Seller CTA */}
        <div className="jewel-dir__band">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#e6c37e] mb-2">For jewellers</p>
            <h3 className="text-xl md:text-2xl font-semibold text-[#fff8ea]">Get your showroom in front of buyers nearby.</h3>
          </div>
          <Link to="/seller/register" className="jewel-dir__cta shrink-0">List your store <FiArrowRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </main>
  );
}

function FilterSelect({ label, value, onChange, options, placeholder, disabled }) {
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <label className={`jewel-dir__field ${disabled ? 'opacity-60' : ''}`}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">{placeholder}</option>
        {items.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function BusinessCard({ business }) {
  const { isDark } = useTheme();
  const logo = shopLogoFor(business, isDark);
  const place = [business.tehsil, business.city || business.district, business.state].filter(Boolean).join(', ');
  const specialities = (business.specialities?.length ? business.specialities : business.subCategories || []).slice(0, 3);
  const established = business.yearEstablished ? new Date().getFullYear() - business.yearEstablished : 0;

  return (
    <article className="jewel-dir__card group">
      <Link to={`/business/${business.shopSlug}`} className="block relative h-44 overflow-hidden jewel-dir__cover">
        {business.banner && !isVideoBanner(business)
          ? <img src={business.banner} alt={business.shopName} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          : <img src="/jewelry/gold-detail.jpg" alt="" loading="lazy" className="w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        {business.isVerified && (
          <span className="absolute top-3 left-3 jewel-dir__badge"><FiCheckCircle className="w-3 h-3" /> Verified</span>
        )}
        {business.numRatings > 0 && (
          <span className="absolute top-3 right-3 jewel-dir__badge">
            <FiStar className="w-3 h-3 fill-current" /> {business.avgRating?.toFixed(1)} · {business.numRatings}
          </span>
        )}
      </Link>

      <div className="px-5 pb-5 -mt-8 relative">
        <div className="w-16 h-16 rounded-2xl jewel-dir__logo flex items-center justify-center overflow-hidden">
          {logo ? <img src={logo} alt="" className="w-full h-full object-contain p-1.5" /> : <span className="text-xl font-semibold">{business.shopName?.charAt(0)}</span>}
        </div>

        <Link to={`/business/${business.shopSlug}`} className="block mt-3 text-lg font-semibold jewel-dir__ink line-clamp-1 hover:underline decoration-[#c99a52] underline-offset-4">
          {business.shopName}
        </Link>
        <p className="text-xs jewel-dir__muted mt-1 flex items-center gap-1.5 line-clamp-1">
          <FiMapPin className="w-3.5 h-3.5 flex-shrink-0" /> {place || business.category}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-3 min-h-[26px]">
          {business.bisRegistration && <span className="jewel-dir__chip is-gold"><FiAward className="w-3 h-3" /> BIS</span>}
          {established > 0 && <span className="jewel-dir__chip">{established}+ yrs</span>}
          {specialities.map((s) => <span key={s} className="jewel-dir__chip">{s}</span>)}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {business.phone ? (
            <>
              <a href={`tel:${business.phone}`} className="jewel-dir__action"><FiPhone className="w-3.5 h-3.5" /> Call</a>
              <a href={`https://wa.me/${toWhatsappNumber(business.whatsapp || business.phone)}?text=${encodeURIComponent(`Hi, I found "${business.shopName}" online and would like to know more about your jewellery.`)}`}
                target="_blank" rel="noreferrer" className="jewel-dir__action is-wa">
                <FaWhatsapp className="w-3.5 h-3.5" /> Chat
              </a>
            </>
          ) : <span className="col-span-2" />}
          <Link to={`/business/${business.shopSlug}`} className="jewel-dir__action is-primary">Visit <FiArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
      </div>
    </article>
  );
}
