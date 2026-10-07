import { useTheme } from '../../context/ThemeContext';
import { FiShoppingBag } from 'react-icons/fi';

const VIDEO_URL = /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)|\/video\/upload\//i;

export const isVideoBanner = (shop) => Boolean(shop?.banner) && (shop.bannerType === 'video' || VIDEO_URL.test(shop.banner));

export const shopLogoFor = (shop, isDark) => shop?.[isDark ? 'darkLogo' : 'lightLogo'] || shop?.logo || '';

// Cover image for a shop listing card. An image banner is shown as-is; a
// video banner (which an <img> can't render) or a missing banner falls back
// to the shop's logo on a soft backdrop.
export default function ShopCover({ shop }) {
  const { isDark } = useTheme();
  const logo = shopLogoFor(shop, isDark);

  if (shop?.banner && !isVideoBanner(shop)) {
    return <img src={shop.banner} alt={shop.shopName} loading="lazy" className="w-full h-full object-cover" />;
  }
  if (logo) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/5 dark:to-white/10">
        <img src={logo} alt={shop.shopName} loading="lazy" className="max-h-full max-w-full object-contain rounded-xl drop-shadow" />
      </div>
    );
  }
  return <FiShoppingBag className="w-10 h-10 text-amber-700" aria-hidden="true" />;
}
