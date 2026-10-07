import { useTheme } from "../../../context/ThemeContext";
import { StoreBody, HeroMeta, HeroActions } from "../StorefrontSections";

// Showcase theme — wide cover banner with a floating shop card overlapping
// its bottom edge (profile-page style), then the shared store body.
export default function ShowcaseTheme(props) {
  const { seller, accent } = props;
  const { isDark } = useTheme();
  const sellerLogo = seller?.[isDark ? "darkLogo" : "lightLogo"] || seller?.logo;

  return (
    <>
      <section className="bg-gray-50 dark:bg-gray-950 pb-6">
        <div className="relative h-56 sm:h-80 lg:h-[26rem] overflow-hidden"
          style={{ background: `linear-gradient(120deg, ${accent} 0%, ${accent}99 50%, #111827 100%)` }}>
          {seller.banner && (seller.bannerType === "video" ? (
            <video src={seller.banner} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <img src={seller.banner} alt={seller.shopName} className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 -mt-20 sm:-mt-24">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-2xl border-4 bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden mx-auto md:mx-0"
              style={{ borderColor: accent }}>
              {sellerLogo ? (
                <img src={sellerLogo} alt={seller.shopName} className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-4xl font-bold" style={{ color: accent }}>{seller.shopName?.charAt(0) || "S"}</span>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2 text-center md:text-left">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{seller.shopName}</h1>
              {seller.description && (
                <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base line-clamp-2 max-w-2xl">{seller.description}</p>
              )}
              <div className="flex justify-center md:justify-start"><HeroMeta seller={seller} light={false} /></div>
            </div>
            <div className="flex justify-center md:justify-end shrink-0">
              <HeroActions seller={seller} accent={accent} invert={false} />
            </div>
          </div>
        </div>
      </section>

      <StoreBody {...props} defaultHeading="Featured Collection" />
    </>
  );
}
