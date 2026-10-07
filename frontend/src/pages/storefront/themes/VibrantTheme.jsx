import { useTheme } from "../../../context/ThemeContext";
import { StoreBody, HeroMeta, HeroActions } from "../StorefrontSections";

// Vibrant theme — bold color-block hero with playful shapes, for stores that
// want energy, then the shared store body.
export default function VibrantTheme(props) {
  const { seller, accent } = props;
  const { isDark } = useTheme();
  const sellerLogo = seller?.[isDark ? "darkLogo" : "lightLogo"] || seller?.logo;

  return (
    <>
      <section className="relative overflow-hidden py-20 sm:py-28"
        style={{ background: `linear-gradient(120deg, ${accent}, ${accent}cc 55%, #f59e0b)` }}>
        <div className="absolute -top-16 -right-10 w-72 h-72 rounded-full bg-white/15 animate-pulse" />
        <div className="absolute -bottom-20 -left-12 w-80 h-80 rounded-full bg-white/10" />
        <div className="absolute top-1/3 left-[12%] w-6 h-6 rounded-full bg-white/40" />
        <div className="absolute bottom-1/4 right-[18%] w-10 h-10 rotate-45 rounded-lg bg-white/25" />
        {seller.banner && (seller.bannerType === "video" ? (
          <video src={seller.banner} className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay" autoPlay loop muted playsInline
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <img src={seller.banner} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay"
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ))}
        <div className="relative max-w-7xl mx-auto px-4 flex flex-col items-center text-center gap-4">
          {sellerLogo && (
            <div className="w-24 h-24 sm:w-28 sm:h-28">
              <img src={sellerLogo} alt={seller.shopName} className="w-full h-full object-contain" />
            </div>
          )}
          <span className="inline-block bg-white/20 text-white text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full">
            ✨ Welcome to the store
          </span>
          <h1 className="text-4xl sm:text-6xl font-black text-white drop-shadow-lg">{seller.shopName}</h1>
          {seller.description && <p className="text-white/90 max-w-xl text-sm sm:text-base">{seller.description}</p>}
          <HeroMeta seller={seller} />
          <div className="pt-2"><HeroActions seller={seller} accent={accent} /></div>
        </div>
      </section>

      <StoreBody {...props} defaultHeading="Shop the Collection" />
    </>
  );
}
