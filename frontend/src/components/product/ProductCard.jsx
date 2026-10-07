import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { FiHeart, FiPhoneCall, FiMessageCircle, FiZap, FiShoppingCart, FiShoppingBag } from 'react-icons/fi';
import { useWishlistStore } from '../../store/wishlistStore';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useNavigate } from 'react-router-dom';
import RatingStars from '../ui/RatingStars';
import { formatPrice, toWhatsappNumber, getEffectiveProductPrice, getEffectiveOriginalPrice, getColorVariant } from '../../utils/helpers';
import { getStoreSlugFromHost, getStoreSlugFromPath, getStorePath, getStoreUrl } from '../../utils/subdomain';
import { savePendingWishlist } from '../../utils/pendingAction';
import { enquiryAPI } from '../../services/api';

export default function ProductCard({ product, dark = false, index = 0 }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const { isAuthenticated, user } = useAuthStore();
  const { addToCart, isLoading: cartLoading } = useCartStore();
  const navigate = useNavigate();
  const hostStoreSlug = getStoreSlugFromHost();
  const storeSlug = hostStoreSlug || getStoreSlugFromPath();
  const isStorefront = Boolean(storeSlug);
  const storeBasePath = hostStoreSlug ? '' : (storeSlug ? getStorePath(storeSlug) : '');

  // real cursor-tracked 3D tilt
  const cardRef = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const springCfg = { stiffness: 260, damping: 22, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [10, -10]), springCfg);
  const rotateY = useSpring(useTransform(px, [0, 1], [-10, 10]), springCfg);
  const glareX = useTransform(px, [0, 1], ['0%', '100%']);
  const glareY = useTransform(py, [0, 1], ['0%', '100%']);
  const glareBg = useTransform([glareX, glareY], ([gx, gy]) => `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.5), transparent 60%)`);

  const handleTiltMove = (e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };
  const resetTilt = () => { px.set(0.5); py.set(0.5); };

  const inWishlist = isInWishlist(product._id);
  // Colour products: the default colour's photo / price, and swatches below.
  // Only products without photos of their own show / add their default colour.
  const defaultVariant = product.images?.length ? null : getColorVariant(product);
  const activeVariantList = (product.variants || []).filter(v => v.isActive !== false);
  const colorOptions = activeVariantList.length
    ? activeVariantList.map(v => ({ name: v.colorName }))
    : (product.colors || []).map(name => ({ name }));
  const primaryImage = product.images?.[0] || defaultVariant?.images?.[0] || product.variants?.find(v => Array.isArray(v.images) && v.images.length > 0)?.images?.[0];
  const displayPrice = getEffectiveProductPrice(product, defaultVariant);
  const displayOriginalPrice = getEffectiveOriginalPrice(product, defaultVariant);
  const discountPercent = displayOriginalPrice && displayOriginalPrice > displayPrice
    ? Math.round(((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100)
    : product.discount || 0;

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      savePendingWishlist(product._id);
      navigate(isStorefront ? `${storeBasePath}/login` : '/login');
      return;
    }
    if (user?.role !== 'user') {
      toast.error('Only customer accounts can save wishlist items.');
      return;
    }
    toggleWishlist(product._id);
  };

  // JustDial-style: no in-app cart on the listing card for seller-owned
  // products — instead, a direct Call + WhatsApp button so the shopper can
  // reach the seller right away. Both stopPropagation so tapping them
  // doesn't also navigate into the product page underneath.
  const isSellerProduct = !!product.sellerId;
  const sellerPhone = product.sellerId?.phone;
  // Plan rule "WhatsApp & Call buttons": the phone only reaches public pages
  // when the seller's plan includes it, so no phone = no buttons.
  const sellerWhatsapp = product.sellerId?.whatsapp || sellerPhone;
  const sellerShopSlug = product.sellerId?.shopSlug;

  // Fire-and-forget lead capture — same pattern as ProductDetail.jsx's
  // logLead. This is the primary place shoppers actually tap Call/WhatsApp
  // (the product grid, not the detail page), so leads were going untracked
  // without this.
  const logLead = (source) => {
    if (!isAuthenticated || !user?.phone || !product?.sellerId?._id) return;
    enquiryAPI.send({
      businessId: product.sellerId._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      message: `Enquired about "${product.name}"`,
      category: product.category,
      source,
    }).catch(() => {});
  };

  const handleCall = (e) => {
    e.preventDefault();
    e.stopPropagation();
    logLead('click_to_call');
    window.location.href = `tel:${sellerPhone}`;
  };

  const handleWhatsapp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    logLead('whatsapp');
    const text = encodeURIComponent(`Hi, I'm interested in "${product.name}" — is it available?`);
    window.open(`https://wa.me/${toWhatsappNumber(sellerWhatsapp)}?text=${text}`, '_blank', 'noreferrer');
  };

  // Store lives on its own subdomain, so this is a real cross-origin
  // navigation, not client-side routing — opened in a new tab so the
  // shopper keeps their place in the listing. Stops propagation so it
  // doesn't also trigger the card's own <Link>.
  const handleViewStore = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(getStoreUrl(sellerShopSlug), '_blank', 'noopener,noreferrer');
  };

  // Add to Cart — works without login (guest cart, merged into the account
  // on login); only Wishlist and Checkout need login. Uses the product's first
  // size/color as default so a one-tap add still works from the grid; the
  // shopper can change size/color on the product page before checkout.
  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product._id, 1, defaultVariant?.sizes?.[0] || product.sizes?.[0], defaultVariant?.colorName || (activeVariantList.length ? '' : product.colors?.[0]));
  };

  const isFlashSale = product.isFlashSale && product.flashSalePrice && (!product.flashSaleEndsAt || new Date(product.flashSaleEndsAt) > new Date());
  const activeDisplayPrice = isFlashSale ? product.flashSalePrice : displayPrice;

  return (
    <div ref={cardRef} style={{ perspective: 1200 }}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); resetTilt(); }}
      onMouseMove={handleTiltMove}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', animationDelay: dark ? `${(index % 5) * 0.5}s` : undefined }}
      className={`group cursor-pointer origin-center relative will-change-transform rounded-2xl overflow-hidden ${
        dark ? 'bg-white/5 backdrop-blur-sm border border-white/10 shadow-sm animate-card-glow' : 'card dark:bg-gray-900 dark:border-gray-800'
      }`}
    >
      {/* glare sweep that follows the cursor, sitting above the surface */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: glareBg, transform: 'translateZ(1px)' }}
      />
      <Link to={`${storeBasePath}/product/${product._id}` || `/product/${product._id}`}>
        {/* Image */}
        <div className={`relative overflow-hidden ${dark ? 'bg-white/5' : 'bg-gray-50 dark:bg-gray-800'}`} style={{ aspectRatio: '3/4', transform: 'translateZ(20px)' }}>
          {!imgLoaded && <div className="absolute inset-0 shimmer" />}
          <img
            src={primaryImage || 'https://via.placeholder.com/300x400?text=growthkarts'}
            alt={product.name}
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-500 ${isHovered ? 'scale-110' : 'scale-100'} ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
          {Array.isArray(product.images) && product.images[1] && isHovered && (
            <img src={product.images[1]} alt={product.name} className="absolute inset-0 w-full h-full object-cover opacity-100 transition-opacity duration-300" />
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {isFlashSale && (
              <span className="bg-[var(--accent,#3b82f6)] text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <FiZap className="w-3 h-3" /> SALE
              </span>
            )}
            {discountPercent > 0 && (
              <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">-{discountPercent}%</span>
            )}
          </div>

          {/* Wishlist */}
          <div className="absolute top-3 right-3">
            <motion.button
              onClick={handleWishlist}
              whileTap={{ scale: 0.9 }}
              className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all ${inWishlist ? 'bg-[var(--accent,#3b82f6)] text-white' : 'bg-white text-gray-600 hover:bg-[var(--accent,#3b82f6)]/10 hover:text-[var(--accent,#3b82f6)]'} ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'} transition-all duration-300`}>
              <FiHeart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
            </motion.button>
          </div>
        </div>

        {/* Details */}
        <motion.div className="p-4" animate={{ y: isHovered ? -2 : 0 }} transition={{ duration: 0.25 }} style={{ transform: 'translateZ(12px)' }}>
          <motion.p animate={{ x: isHovered ? 3 : 0 }} transition={{ duration: 0.25 }} className={`text-xs font-medium uppercase tracking-wide mb-1 ${dark ? 'text-[var(--accent,#60a5fa)]' : 'text-[var(--accent,#2563eb)] dark:text-[var(--accent,#60a5fa)]'}`}>{product.brand}</motion.p>
          <h3 className={`font-medium text-sm line-clamp-2 mb-1 transition-colors ${dark ? 'text-white group-hover:text-[var(--accent,#60a5fa)]' : 'text-gray-800 dark:text-gray-100 group-hover:text-[var(--accent,#2563eb)] dark:group-hover:text-[var(--accent,#60a5fa)]'}`}>{product.name}</h3>
          {/* JustDial-style seller attribution — lets the shopper see, at a glance,
              which local business they'd be dealing with (or "growthkarts" itself
              for admin-owned catalog items). */}
          {product.sellerId?.shopName && !isStorefront && (
            <p className={`text-xs mb-1.5 truncate ${dark ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
              Sold by <span className={`font-medium ${dark ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'}`}>{product.sellerId.shopName}</span>
            </p>
          )}
          <RatingStars rating={product.ratings} showCount count={product.numReviews} dark={dark} />
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{formatPrice(activeDisplayPrice)}</span>
            {displayOriginalPrice && displayOriginalPrice > activeDisplayPrice && (
              <span className={`text-sm line-through ${dark ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>{formatPrice(displayOriginalPrice)}</span>
            )}
          </div>
          {colorOptions.length > 1 && (
            <p className={`text-xs mt-2 ${dark ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`} title={colorOptions.map(c => c.name).join(', ')}>
              {colorOptions.length} Colors
            </p>
          )}
          {/* Size chips */}
          {product.sizes?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.sizes.slice(0, 4).map(size => (
                <span key={size} className={`text-xs rounded px-2 py-0.5 border ${dark ? 'border-white/15 text-gray-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'}`}>{size}</span>
              ))}
              {product.sizes.length > 4 && <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>+{product.sizes.length - 4}</span>}
            </div>
          )}

        </motion.div>
      </Link>

      {/* NOTE: these action buttons are intentionally OUTSIDE the <Link>
          above. A <button> nested inside an <a> (which Link renders to) is
          invalid HTML — browsers handle the tap inconsistently, so Call /
          WhatsApp / Store taps would sometimes navigate into the product
          page instead of doing their own thing. Keeping them as siblings
          fixes that, while translateZ keeps the 3D tilt looking the same. */}
      <div className="p-3 sm:p-4 pt-0 sm:pt-0" style={{ transform: 'translateZ(12px)' }}>
        {/* Admin-owned catalog items (no seller) keep the in-app Add to
            Cart purchase path. Seller-owned products are JustDial-style
            "connect, don't checkout" — Call/WhatsApp only, no cart. */}
        {(!isSellerProduct || isStorefront) && (
          <div className="flex gap-1.5 sm:gap-2">
            <button
              onClick={handleAddToCart}
              disabled={cartLoading}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2 rounded-lg font-semibold text-xs transition-colors disabled:opacity-60 ${
                dark ? 'bg-[var(--accent,#3b82f6)] text-white hover:brightness-110' : 'bg-[var(--accent,#111827)] dark:bg-[var(--accent,#2563eb)] text-white hover:bg-[var(--accent,#1f2937)] dark:hover:bg-[var(--accent,#1d4ed8)]'
              }`}
            >
              <FiShoppingCart className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Add to Cart</span>
            </button>
            {/* Seller's own store: also Call / WhatsApp, only on plans with contact buttons */}
            {isStorefront && sellerPhone && (
              <>
                <button onClick={handleCall} title="Call seller" aria-label="Call seller"
                  className="w-9 shrink-0 flex items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">
                  <FiPhoneCall className="w-4 h-4" />
                </button>
                <button onClick={handleWhatsapp} title="Message seller on WhatsApp" aria-label="Message seller on WhatsApp"
                  className="w-9 shrink-0 flex items-center justify-center rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors">
                  <FiMessageCircle className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Marketplace cards can connect shoppers to a seller. Seller
          storefront cards intentionally show only Add to Cart; the full
          Call, WhatsApp and Store actions remain on ProductDetail. */}
        {isSellerProduct && !isStorefront && (sellerPhone || sellerShopSlug) && (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {sellerPhone && (
              <button
                onClick={handleCall}
                title="Call seller"
                aria-label="Call seller"
                className="w-full h-9 sm:h-11 flex items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                <FiPhoneCall className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
            {sellerPhone && (
              <button
                onClick={handleWhatsapp}
                title="Message seller on WhatsApp"
                aria-label="Message seller on WhatsApp"
                className="w-full h-9 sm:h-11 flex items-center justify-center rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
              >
                <FiMessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
           {sellerShopSlug && (
  <button
    onClick={handleViewStore}
    title="View Store"
    aria-label="View Store"
    className={`min-w-0 h-9 sm:h-11 flex items-center justify-center gap-1 px-1 sm:px-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
      dark
        ? 'border-2 border-white/20 text-gray-200 hover:bg-white/10'
        : 'border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
    }`}
  >
    <FiShoppingBag className="w-4 h-4 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
    {/* Icon only on narrow cards — the label doesn't fit next to it */}
    <span className="hidden sm:inline">Store</span>
  </button>
)}
          </div>
        )}
      </div>
    </motion.div>
    </div>
  );
}
