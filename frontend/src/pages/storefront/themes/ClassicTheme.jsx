import { useTheme } from "../../../context/ThemeContext";
import { StoreBody, HeroMeta, HeroActions } from "../StorefrontSections";

// Classic theme — full-width cinematic banner with the shop identity on a
// soft gradient, then the shared store body (trust strip, categories,
// new arrivals, sortable grid, about/contact).
export default function ClassicTheme(props) {
  const { seller, accent } = props;
  const { isDark } = useTheme();
  const sellerLogo = seller?.[isDark ? "darkLogo" : "lightLogo"] || seller?.logo;

  return (
    <>
      <section className="relative min-h-[26rem] sm:min-h-[34rem] flex items-end overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${accent} 0%, #111827 100%)` }}>
        {seller.banner ? (
          seller.bannerType === "video" ? (
            <video src={seller.banner} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <img src={seller.banner} alt={seller.shopName} className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          )
        ) : (
          <>
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-40" style={{ background: accent }} />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

        <div className="relative max-w-7xl mx-auto px-4 pb-10 sm:pb-14 w-full">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-7">
            {sellerLogo && (
              <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0">
                <img src={sellerLogo} alt={seller.shopName} className="w-full h-full object-contain" />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-3">
              <HeroMeta seller={seller} />
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">{seller.shopName}</h1>
              {seller.description && (
                <p className="text-white/85 text-sm sm:text-base max-w-2xl line-clamp-2">{seller.description}</p>
              )}
              <div className="pt-2"><HeroActions seller={seller} accent={accent} /></div>
            </div>
          </div>
        </div>
      </section>

      <StoreBody {...props} />
    </>
  );
}
