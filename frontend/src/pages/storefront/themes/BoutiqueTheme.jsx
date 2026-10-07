import { useTheme } from "../../../context/ThemeContext";
import { StoreBody, HeroMeta, HeroActions } from "../StorefrontSections";

// Boutique theme — split-screen hero: the banner fills one half edge to edge,
// the shop identity sits on a solid accent panel on the other, then the
// shared store body.
export default function BoutiqueTheme(props) {
  const { seller, accent } = props;
  const { isDark } = useTheme();
  const sellerLogo = seller?.[isDark ? "darkLogo" : "lightLogo"] || seller?.logo;

  return (
    <>
      <section className="grid lg:grid-cols-2 min-h-[30rem] lg:min-h-[36rem]">
        <div className="relative min-h-[18rem] overflow-hidden order-1 lg:order-none"
          style={{ background: `linear-gradient(135deg, ${accent}40, ${accent}10)` }}>
          {seller.banner ? (
            seller.bannerType === "video" ? (
              <video src={seller.banner} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline
                onError={(e) => { e.currentTarget.style.display = "none"; }} />
            ) : (
              <img src={seller.banner} alt={seller.shopName} className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }} />
            )
          ) : sellerLogo ? (
            <img src={sellerLogo} alt="" className="absolute inset-0 m-auto w-1/2 h-1/2 object-contain opacity-80" />
          ) : null}
        </div>

        <div className="relative flex items-center overflow-hidden" style={{ background: accent }}>
          <div className="absolute -right-24 -bottom-24 w-80 h-80 rounded-full border-[40px] border-white/10" />
          <div className="relative w-full px-8 sm:px-14 py-14 space-y-5 text-white">
            {sellerLogo && (
              <div className="w-20 h-20 rounded-2xl bg-white p-2 shadow-lg">
                <img src={sellerLogo} alt={seller.shopName} className="w-full h-full object-contain" />
              </div>
            )}
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-white/75">Boutique</p>
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold leading-tight tracking-tight">{seller.shopName}</h1>
            <div className="w-16 h-1 rounded-full bg-white/70" />
            {seller.description && (
              <p className="text-white/85 max-w-md leading-relaxed text-sm sm:text-base line-clamp-3">{seller.description}</p>
            )}
            <HeroMeta seller={seller} />
            <div className="pt-1"><HeroActions seller={seller} accent={accent} /></div>
          </div>
        </div>
      </section>

      <StoreBody {...props} defaultHeading="Our Pieces" />
    </>
  );
}
