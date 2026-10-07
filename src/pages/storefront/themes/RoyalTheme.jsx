import { useTheme } from "../../../context/ThemeContext";
import { StoreBody, HeroMeta, HeroActions } from "../StorefrontSections";

// Royal theme — dark heritage look for jewellers: deep espresso backdrop,
// the banner inside a gold-edged arch, serif shop name and fine ornamental
// rules, then the shared store body.
export default function RoyalTheme(props) {
  const { seller, accent } = props;
  const { isDark } = useTheme();
  const sellerLogo = seller?.[isDark ? "darkLogo" : "lightLogo"] || seller?.logo;
  const gold = "#d4af6a";

  return (
    <>
      <section className="relative overflow-hidden"
        style={{ background: `radial-gradient(ellipse at 70% 40%, ${accent}55 0%, transparent 55%), linear-gradient(160deg, #1c140d 0%, #0d0906 100%)` }}>
        {/* fine gold frame */}
        <div className="pointer-events-none absolute inset-4 sm:inset-6 border" style={{ borderColor: `${gold}40` }} />
        <div className="relative max-w-7xl mx-auto px-6 sm:px-10 py-14 sm:py-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            {sellerLogo && (
              <img src={sellerLogo} alt={seller.shopName} className="h-20 sm:h-24 w-auto object-contain mx-auto lg:mx-0" />
            )}
            <div className="flex items-center justify-center lg:justify-start gap-3 text-[11px] font-semibold tracking-[0.35em] uppercase" style={{ color: gold }}>
              <span className="h-px w-10" style={{ background: gold }} />
              Fine Jewellery House
              <span className="h-px w-10" style={{ background: gold }} />
            </div>
            <h1 className="text-4xl sm:text-6xl leading-[1.05] text-[#f6ecd9]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
              {seller.shopName}
            </h1>
            {seller.description && (
              <p className="text-[#d9cdb8]/80 max-w-xl mx-auto lg:mx-0 leading-relaxed text-sm sm:text-base">{seller.description}</p>
            )}
            <div className="flex justify-center lg:justify-start"><HeroMeta seller={seller} /></div>
            <div className="flex justify-center lg:justify-start pt-1"><HeroActions seller={seller} accent={accent} /></div>
          </div>

          {/* banner in an arch */}
          <div className="relative mx-auto w-full max-w-sm sm:max-w-md">
            <div className="absolute -inset-3 rounded-t-[999px] border" style={{ borderColor: `${gold}66` }} />
            <div className="relative aspect-[4/5] rounded-t-[999px] overflow-hidden shadow-2xl"
              style={{ background: `linear-gradient(180deg, ${accent}, #1c140d)` }}>
              {seller.banner ? (
                seller.bannerType === "video" ? (
                  <video src={seller.banner} className="w-full h-full object-cover" autoPlay loop muted playsInline
                    onError={(e) => { e.currentTarget.style.display = "none"; }} />
                ) : (
                  <img src={seller.banner} alt={seller.shopName} className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none"; }} />
                )
              ) : sellerLogo ? (
                <img src={sellerLogo} alt="" className="absolute inset-0 m-auto w-1/2 h-1/2 object-contain opacity-90" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-7xl text-[#f6ecd9]"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                  {seller.shopName?.charAt(0) || "S"}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <StoreBody {...props} defaultHeading="The Royal Collection" />
    </>
  );
}
