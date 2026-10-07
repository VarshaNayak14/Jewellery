import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiPhone,
  FiMapPin,
  FiStar,
  FiClock,
  FiCheckCircle,
  FiShoppingBag,
  FiNavigation,
  FiAward,
  FiImage,
  FiShield,
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { businessAPI, enquiryAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { toWhatsappNumber } from '../utils/helpers';
import { getStoreUrl } from '../utils/subdomain';
import { useTheme } from '../context/ThemeContext';
import { isVideoBanner } from '../components/common/ShopCover';

// Same pick as the storefront navbar: theme-matching logo first, plain logo as fallback.
const shopLogo = (shop, isDark) => shop?.[isDark ? 'darkLogo' : 'lightLogo'] || shop?.logo;

const DAYS = [
  ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'],
  ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun'],
];

// Shared card shell for every section below the header, so spacing/border/
// dark-mode treatment stays identical across all of them.
const Section = ({ title, icon: Icon, children }) => (
  <div className="bg-[#fffdf8] dark:bg-[#1e1913] border border-[rgba(169,131,69,0.22)] dark:border-[rgba(218,190,138,0.15)] rounded-3xl p-5 sm:p-6">
    {title && (
      <h2 className="font-semibold text-[#2f2619] dark:text-white mb-4 flex items-center gap-2 text-sm sm:text-base">
        {Icon && <Icon className="w-4 h-4 flex-shrink-0 text-[#a98345]" />}
        {title}
      </h2>
    )}
    {children}
  </div>
);

export default function BusinessProfile() {
  const { slug } = useParams();
  const { isDark } = useTheme();
  const { user, isAuthenticated } = useAuthStore();

  const [business, setBusiness] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    setLoading(true);
    businessAPI.getProfile(slug)
      .then((d) => { setBusiness(d.data); setRelated(d.related || []); })
      .catch(() => setBusiness(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const logLead = (source) => {
    if (!isAuthenticated || !user?.phone || !business?._id) return;
    enquiryAPI.send({
      businessId: business._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      message: 'Enquired via business profile page',
      category: business.category,
      source,
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf6ee] dark:bg-[#15110d] flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-5xl px-4">
          <div className="h-56 sm:h-72 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-[#faf6ee] dark:bg-[#15110d] flex items-center justify-center text-center px-4">
        <div>
          <FiShoppingBag className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">This jeweller could not be found.</p>
          <Link to="/nearby" className="inline-block mt-3 text-sm font-semibold text-[#8b6835] hover:underline">See jewellers near you →</Link>
        </div>
      </div>
    );
  }

  const hasHours = business.workingHours && Object.values(business.workingHours).some(Boolean);
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    business.address || `${business.shopName}, ${business.city || ''} ${business.state || ''}`
  )}`;

  return (
    <main className="bg-[#faf6ee] dark:bg-[#15110d] min-h-screen pb-16 text-gray-900 dark:text-gray-100">
      {/* Hero banner — full-bleed, business identity overlaid like a storefront hero */}
      <div className="relative h-56 sm:h-80 lg:h-[22rem] w-full overflow-hidden bg-[#1c150d]">
        {!business.banner && <img src="/jewelry/gold-detail.jpg" alt="" className="w-full h-full object-cover opacity-70" />}
        {business.banner && (isVideoBanner(business) ? (
          <video src={business.banner} className="w-full h-full object-cover" autoPlay loop muted playsInline
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <img src={business.banner} alt="" className="w-full h-full object-cover" />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-[#140e07]/85 via-black/15 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 sm:-mt-20 relative">
        {/* Header card */}
        <div className="bg-[#fffdf8] dark:bg-[#1e1913] border border-[rgba(169,131,69,0.22)] dark:border-[rgba(218,190,138,0.15)] rounded-3xl shadow-[0_24px_50px_-30px_rgba(73,52,22,0.5)] p-5 sm:p-7 flex flex-col sm:flex-row gap-5">
          <div className={`w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center flex-shrink-0 -mt-10 sm:mt-0 ${shopLogo(business, isDark) ? '' : 'rounded-2xl bg-[#f5ecd9] dark:bg-[#2a2219] border-4 border-[#fffdf8] dark:border-[#1e1913] shadow overflow-hidden'}`}>
            {shopLogo(business, isDark) ? (
              <img src={shopLogo(business, isDark)} alt={business.shopName} className="w-full h-full object-contain" />
            ) : (
              <span className="text-3xl font-semibold text-[#8b6835]">{business.shopName?.charAt(0)}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#660032] dark:text-[#fff8ea]">{business.shopName}</h1>
              {business.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                  <FiCheckCircle className="w-3.5 h-3.5" /> Verified
                </span>
              )}
            </div>
            {(business.bisRegistration || business.yearEstablished || business.specialities?.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {business.bisRegistration && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f5ecd9] text-[#6b4c26] dark:bg-[#a98345]/20 dark:text-[#f0d79f]">
                    <FiAward className="w-3.5 h-3.5" /> BIS registered
                  </span>
                )}
                {business.yearEstablished > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-full border border-[rgba(169,131,69,0.3)] text-[#6b5638] dark:text-[#d8c6a4]">
                    Since {business.yearEstablished}
                  </span>
                )}
                {business.specialities?.slice(0, 5).map((s) => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded-full border border-[rgba(169,131,69,0.3)] text-[#6b5638] dark:text-[#d8c6a4]">{s}</span>
                ))}
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {business.category}
              {business.city ? ` • ${business.city}${business.state ? ', ' + business.state : ''}` : ''}
            </p>
            {business.numRatings > 0 && (
              <div className="flex items-center gap-1 mt-1.5 text-sm text-gray-700 dark:text-gray-300">
                <FiStar className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold">{business.avgRating?.toFixed(1)}</span>
                <span className="text-gray-400 dark:text-gray-500">({business.numRatings} ratings)</span>
              </div>
            )}
            {business.address && (
              <p className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-400 mt-2">
                <FiMapPin className="w-4 h-4 mt-0.5 flex-shrink-0" /> {business.address}
              </p>
            )}
            <a href={mapsHref} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-2">
              <FiNavigation className="w-3.5 h-3.5" /> Get Directions
            </a>
          </div>

          {/* Call / WhatsApp — full width row on mobile, fixed column on desktop */}
          <div className="flex sm:flex-col gap-2 sm:w-40 flex-shrink-0">
            <a href={`tel:${business.phone}`} onClick={() => logLead('click_to_call')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#a98345] text-white text-sm font-semibold hover:bg-[#8b6835] transition-colors">
              <FiPhone className="w-4 h-4" /> Call Now
            </a>
            <a href={`https://wa.me/${toWhatsappNumber(business.whatsapp || business.phone)}?text=${encodeURIComponent(`Hi, I found "${business.shopName}" online and I'm interested in your jewellery.`)}`}
              target="_blank" rel="noreferrer" onClick={() => logLead('whatsapp')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors">
              <FaWhatsapp className="w-4 h-4" /> WhatsApp
            </a>
          </div>
        </div>

        {/* Main 2-column layout on large screens — content on the left,
            a sticky action/info sidebar on the right, so wide viewports
            actually use the available width instead of one narrow stacked column. */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {business.description && (
              <Section title="About">
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">{business.description}</p>
              </Section>
            )}

            <Section title="Why buy here" icon={FiShield}>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  ['Hallmarked gold', business.bisRegistration ? `BIS reg. ${business.bisRegistration}` : 'BIS hallmark on gold pieces'],
                  ['Bill with details', 'Weight, purity & making shown on invoice'],
                  ['Visit the showroom', 'Try pieces in person before you buy'],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-2xl bg-[#faf3e4] dark:bg-white/5 p-4">
                    <p className="text-sm font-semibold text-[#2f2619] dark:text-white">{t}</p>
                    <p className="text-xs text-[#7d6d55] dark:text-[#bfae92] mt-1">{d}</p>
                  </div>
                ))}
              </div>
              {business.gstin && <p className="text-xs text-[#7d6d55] dark:text-[#bfae92] mt-3">GSTIN: <span className="font-semibold tracking-wide">{business.gstin}</span></p>}
            </Section>

            {business.amenities?.length > 0 && (
              <Section title="Highlights" icon={FiAward}>
                <div className="flex flex-wrap gap-2">
                  {business.amenities.map((tag) => (
                    <span key={tag} className="text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {business.gallery?.length > 0 && (
              <Section title="Photos" icon={FiImage}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {business.gallery.map((src, i) => (
                    <button key={i} onClick={() => setLightbox(src)}
                      className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 group">
                      <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {related.length > 0 && (
              <Section title="Other jewellers nearby">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {related.map((r) => (
                    <Link key={r._id} to={`/business/${r.shopSlug}`}
                      className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 p-3 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-sm transition-all">
                      <div className="w-11 h-11 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100 dark:border-gray-800">
                        {shopLogo(r, isDark) ? <img src={shopLogo(r, isDark)} alt="" className="w-full h-full object-cover" /> : <FiShoppingBag className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">{r.shopName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{r.category}{r.city ? ` • ${r.city}` : ''}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5 lg:sticky lg:top-[calc(var(--navbar-height,96px)+1.25rem)] lg:self-start">
            {hasHours && (
              <Section title="Working Hours" icon={FiClock}>
                <div className="space-y-1.5 text-sm">
                  {DAYS.map(([key, label]) => (
                    <div key={key} className="flex justify-between border-b border-gray-100 dark:border-gray-800 last:border-0 pb-1.5 last:pb-0">
                      <span className="text-gray-500 dark:text-gray-400">{label}</span>
                      <span className="text-gray-800 dark:text-gray-200 font-medium text-right">{business.workingHours[key] || 'Closed'}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

        {business.shopSlug && (
  <a
    href={getStoreUrl(business.shopSlug)}
    target="_blank"
    rel="noopener noreferrer"
    className="block rounded-3xl p-6 text-center text-white shadow-sm bg-[linear-gradient(100deg,rgba(26,18,9,0.92),rgba(66,12,36,0.85)),url('/jewelry/necklace.jpg')] bg-cover bg-center hover:brightness-110 transition"
  >
    <span className="block text-[11px] uppercase tracking-[0.25em] text-[#e6c37e] mb-1">Collection</span>
    <span className="font-semibold">See all jewellery from {business.shopName} →</span>
  </a>
)}
          </div>
        </div>
      </div>

      {/* Photo lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </main>
  );
}
