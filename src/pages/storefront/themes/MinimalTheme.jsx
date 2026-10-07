import { useTheme } from "../../../context/ThemeContext";
import { StoreBody, HeroMeta, HeroActions } from "../StorefrontSections";

// Minimal theme — quiet, editorial split hero (text left, banner right),
// then the shared store body.
export default function MinimalTheme(props) {
  const { seller, accent } = props;
  const { isDark } = useTheme();
  const sellerLogo = seller?.[isDark ? "darkLogo" : "lightLogo"] || seller?.logo;

  return (
    <>
      <section className="bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5 text-center lg:text-left">
            {sellerLogo ? (
              <img src={sellerLogo} alt={seller.shopName} className="h-20 w-auto object-contain mx-auto lg:mx-0" />
            ) : (
              <div className="w-20 h-20 rounded-full mx-auto lg:mx-0 flex items-center justify-center text-white text-2xl font-bold" style={{ background: accent }}>
                {seller.shopName?.charAt(0) || "S"}
              </div>
            )}
            <div className="flex justify-center lg:justify-start"><HeroMeta seller={seller} light={false} /></div>
            <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-gray-900 dark:text-gray-100">{seller.shopName}</h1>
            <div className="w-12 h-0.5 mx-auto lg:mx-0" style={{ background: accent }} />
            {seller.description && (
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto lg:mx-0 leading-relaxed">{seller.description}</p>
            )}
            <div className="flex justify-center lg:justify-start pt-2"><HeroActions seller={seller} accent={accent} invert={false} /></div>
          </div>
          <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl"
            style={{ background: `linear-gradient(135deg, ${accent}33, ${accent}0d)` }}>
            {seller.banner ? (
              seller.bannerType === "video" ? (
                <video src={seller.banner} className="w-full h-full object-cover" autoPlay loop muted playsInline
                  onError={(e) => { e.currentTarget.style.display = "none"; }} />
              ) : (
                <img src={seller.banner} alt={seller.shopName} className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none"; }} />
              )
            ) : sellerLogo ? (
              <img src={sellerLogo} alt="" className="absolute inset-0 m-auto w-1/2 h-1/2 object-contain opacity-80" />
            ) : null}
          </div>
        </div>
      </section>

      <StoreBody {...props} defaultHeading="The Collection" />
    </>
  );
}
