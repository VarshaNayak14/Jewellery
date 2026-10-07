import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHeart, FiRefreshCw,
  FiShare2, FiChevronRight, FiZoomIn, FiX,
  FiChevronLeft, FiChevronRight as FiChevronRightIcon, FiImage,
  FiPhoneCall, FiShoppingBag, FiUser, FiStar, FiThumbsUp
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { productAPI, reviewAPI, enquiryAPI } from '../services/api';
import { ReviewMedia, ReviewMediaUploader } from '../components/common/ReviewMedia';
import { getStoreSlugFromHost, getStoreSlugFromPath, getStorePath, getStoreUrl } from '../utils/subdomain';
import { useWishlistStore } from '../store/wishlistStore';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import RatingStars from '../components/ui/RatingStars';
import Button from '../components/ui/Button';
import { ProductCardSkeleton } from '../components/ui/Skeleton';
import { formatPrice, formatDateShort, toWhatsappNumber, getEffectiveProductPrice, getEffectiveOriginalPrice, colorSwatch, cleanSizes } from '../utils/helpers';
import { savePendingWishlist } from '../utils/pendingAction';
import toast from 'react-hot-toast';
import ProductCard from '../components/product/ProductCard';
import JewellerySpecs from '../components/jewellery/JewellerySpecs';

// Reviews shown before the "View all reviews" button expands the rest.
const REVIEWS_PREVIEW_COUNT = 3;

const COLOR_HEX = {
  Black: '#111827', White: '#f9fafb', Gray: '#6b7280', Navy: '#1e3a5f',
  Blue: '#3b82f6', Red: '#ef4444', red: '#ec4899', Green: '#22c55e',
  Yellow: '#eab308', Brown: '#92400e', Beige: '#d4b896', Orange: '#f97316',
  Purple: '#a855f7', Maroon: '#7f1d1d', Olive: '#65a30d', Teal: '#14b8a6',
  Burgundy: '#6b1e2b', Mustard: '#d97706', Coral: '#f8705a', Cream: '#fffbeb',
};

// ─── Fullscreen Lightbox ──────────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIdx(i => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full z-10 transition-colors">
        <FiX className="w-7 h-7" />
      </button>
      <button
        onClick={e => { e.stopPropagation(); setIdx(i => Math.max(0, i - 1)); }}
        className={`absolute left-4 text-white p-3 hover:bg-white/10 rounded-full transition-colors ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
      >
        <FiChevronLeft className="w-8 h-8" />
      </button>
      <AnimatePresence mode="wait">
        <motion.img
          key={idx}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          src={images[idx]}
          alt=""
          className="max-h-[88vh] max-w-[88vw] object-contain rounded-xl select-none"
          onClick={e => e.stopPropagation()}
          draggable={false}
        />
      </AnimatePresence>
      <button
        onClick={e => { e.stopPropagation(); setIdx(i => Math.min(images.length - 1, i + 1)); }}
        className={`absolute right-4 text-white p-3 hover:bg-white/10 rounded-full transition-colors ${idx === images.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
      >
        <FiChevronRightIcon className="w-8 h-8" />
      </button>
      <div className="absolute bottom-6 flex gap-2">
        {images.map((_, i) => (
          <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
            className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`} />
        ))}
      </div>
      <div className="absolute bottom-6 right-6 text-white/60 text-sm">
        {idx + 1} / {images.length}
      </div>
    </motion.div>
  );
}

// ─── Enhanced Image Gallery ───────────────────────────────────────────────────
function ImageGallery({ images, selectedColor, onLightbox, discount = 0, isFlashSaleActive = false }) {
  const [activeImg, setActiveImg] = useState(0);
  const galleryRef = useRef(null);
  const touchStartX = useRef(null);

  useEffect(() => { setActiveImg(0); }, [selectedColor]);

  // Mouse wheel horizontal scroll on thumbnail bar
  const handleWheel = useCallback((e) => {
    if (galleryRef.current) {
      e.preventDefault();
      galleryRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  // Touch swipe on main image
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) setActiveImg(i => Math.min(images.length - 1, i + 1));
      else setActiveImg(i => Math.max(0, i - 1));
    }
    touchStartX.current = null;
  };

  const goLeft = () => setActiveImg(i => Math.max(0, i - 1));
  const goRight = () => setActiveImg(i => Math.min(images.length - 1, i + 1));

  if (!images || images.length === 0) {
    return (
      <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-2xl aspect-[3/4] flex items-center justify-center text-gray-400 dark:text-gray-500">
        <FiImage className="w-12 h-12" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex gap-3 w-full">
      {/* Vertical Thumbnails */}
      {images.length > 1 && (
        <div
          ref={galleryRef}
          onWheel={handleWheel}
          className="hidden lg:flex flex-col gap-2 w-20 flex-shrink-0 max-h-[580px] overflow-y-auto no-scrollbar"
          style={{ scrollbarWidth: 'none' }}
        >
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveImg(i)}
              className={`relative w-20 h-24 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                activeImg === i
                  ? 'border-blue-500 shadow-md shadow-blue-100 dark:shadow-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-100 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Main Image */}
      <div className="flex-1 relative">
        <div
          className="relative bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden aspect-[3/4] shadow-sm group cursor-zoom-in"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => onLightbox(activeImg)}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={`${selectedColor}-${activeImg}`}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              src={images[activeImg] || 'https://via.placeholder.com/600?text=No+Image'}
              alt="Product"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              draggable={false}
            />
          </AnimatePresence>

          {(discount > 0 || isFlashSaleActive) && (
            <div className="absolute top-3 left-3 z-10 flex max-w-[calc(100%-5rem)] flex-wrap items-start gap-2">
              {discount > 0 && (
                <span className="bg-blue-500 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap">
                  -{discount}% OFF
                </span>
              )}
              {isFlashSaleActive && (
                <span className="bg-amber-500 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap">
                  FLASH SALE
                </span>
              )}
            </div>
          )}

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); goLeft(); }}
                className={`absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 dark:bg-gray-900/90 rounded-full shadow flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all opacity-0 group-hover:opacity-100 ${activeImg === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <FiChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); goRight(); }}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 dark:bg-gray-900/90 rounded-full shadow flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all opacity-0 group-hover:opacity-100 ${activeImg === images.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <FiChevronRightIcon className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Zoom hint */}
          <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <FiZoomIn className="w-3.5 h-3.5" /> Click to zoom
          </div>

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
              {activeImg + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Mobile horizontal thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar lg:hidden pb-1">
            {images.map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  activeImg === i ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700 opacity-60'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Dot indicators */}
        {images.length > 1 && (
          <div className="hidden lg:flex justify-center gap-1.5 mt-3">
            {images.map((_, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className={`rounded-full transition-all ${i === activeImg ? 'w-5 h-2 bg-blue-500' : 'w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProductDetail({ storefrontSeller = null }) {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  // null while unknown/not logged in; otherwise { canReview, reason } from
  // GET /reviews/can-review/:id — drives which of the three states (write /
  // already reviewed / buy-to-unlock) the review section shows.
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);
  // The product's own photos show first; a colour's photos only once the
  // shopper taps that colour.
  const [colorPicked, setColorPicked] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '', images: [], videos: [] });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [lightboxStart, setLightboxStart] = useState(null);
  const [activeTab, setActiveTab] = useState('description');

  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const { isAuthenticated, user } = useAuthStore();
  const { addToCart, isLoading: cartLoading } = useCartStore();
  const navigate = useNavigate();
  const hostStoreSlug = getStoreSlugFromHost();
  const storeSlug = hostStoreSlug || getStoreSlugFromPath();
  const storeBasePath = hostStoreSlug ? '' : (storeSlug ? getStorePath(storeSlug) : '');
  const isStorefront = Boolean(storefrontSeller || storeSlug);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      productAPI.getOne(id),
      reviewAPI.getByProduct(id, { limit: 50 }),
    ]).then(([productData, reviewData]) => {
      const p = productData.product;
      if (!p) {
        setProduct(null);
        setReviews(reviewData.reviews || []);
        return;
      }

      const sellerRef = p?.sellerId;
      const sellerId = typeof sellerRef === 'string' ? sellerRef : sellerRef?._id;
      const sellerSlug = typeof sellerRef === 'string' ? null : sellerRef?.shopSlug;
      const storefrontSellerId = storefrontSeller?._id ? String(storefrontSeller._id) : '';
      const storefrontSellerSlug = storefrontSeller?.shopSlug || storeSlug;

      const belongsToStore = !isStorefront || (
        (sellerId && String(sellerId) === storefrontSellerId) ||
        (sellerSlug && String(sellerSlug) === String(storefrontSellerSlug)) ||
        (sellerSlug && String(sellerSlug) === String(storeSlug)) ||
        (!sellerId && !sellerSlug)
      );

      setProduct(belongsToStore ? p : null);
      setReviews(reviewData.reviews || []);

      // Initialise variant or legacy color
      const activeVariants = p?.variants?.filter(v => v.isActive) || [];
      if (activeVariants.length > 0) {
        const defaultV = activeVariants.find(v => v.isDefault) || activeVariants[0];
        setSelectedVariant(defaultV);
        setColorPicked(false);
        // With photos of its own the product itself ("Main") is shown first;
        // otherwise its default colour.
        if (p.images?.length > 0) {
          setSelectedColor('');
          setSelectedSize(cleanSizes(p.sizes)[0] || '');
        } else {
          setSelectedColor(defaultV.colorName);
          setSelectedSize(cleanSizes(defaultV.sizes)[0] || '');
        }
      } else {
        setSelectedColor(p?.colors?.[0] || '');
        setSelectedSize(cleanSizes(p?.sizes)[0] || '');
        setColorPicked(false);
      }

      if (p?.category && belongsToStore) {
        productAPI.getAll({
          category: p.category,
          sellerId: isStorefront ? (p.sellerId?._id || storefrontSeller?._id) : undefined,
          limit: 5,
        }).then(d => setRelated(d.products?.filter(x => x._id !== id).slice(0, 4) || []));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || !id) { setReviewEligibility(null); return; }
    reviewAPI.canReview(id)
      .then(data => setReviewEligibility({ canReview: data.canReview, reason: data.reason }))
      .catch(() => setReviewEligibility(null));
  }, [id, isAuthenticated]);

  // Derive display data from selected variant or legacy fields
  const activeVariants = product?.variants?.filter(v => v.isActive) || [];
  const hasVariants = activeVariants.length > 0;

  const getDisplayImages = () => {
    if (!product) return [];
    const ownImages = product.images || [];
    if (colorPicked || ownImages.length === 0) {
      if (hasVariants && selectedVariant?.images?.length > 0) return selectedVariant.images;
      // legacy colorImages
      const colorImgs = selectedColor && product.colorImages?.[selectedColor];
      if (colorImgs && colorImgs.length > 0) return colorImgs;
    }
    return ownImages;
  };

  const displayImages = getDisplayImages();

  // One tile per colour, showing that colour's own photo (Meesho-style).
  const colorTiles = !product ? [] : hasVariants
    ? activeVariants.map(v => ({ name: v.colorName, image: v.images?.[0] || null, variant: v }))
    : (product.colors || []).map(c => ({ name: c, image: product.colorImages?.[c]?.[0] || null, variant: null }));

  const isFlashSaleActive = product?.isFlashSale && (!product.flashSaleEndsAt || new Date(product.flashSaleEndsAt) > new Date());
  // The variant being bought right now: none while "Main" is shown.
  const mainAvailable = hasVariants && product?.images?.length > 0;
  const activeVariant = hasVariants && (colorPicked || !mainAvailable) ? selectedVariant : null;
  const displayPrice = getEffectiveProductPrice(product, activeVariant);
  const displayOriginalPrice = getEffectiveOriginalPrice(product, activeVariant);

  const displayStock = activeVariant ? activeVariant.stock : product?.stock || 0;
  const displaySizes = cleanSizes(activeVariant ? activeVariant.sizes : product?.sizes);
  const discount = displayOriginalPrice && displayOriginalPrice > displayPrice
    ? Math.round(((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100)
    : 0;

  const handleColorChange = (colorName, variant) => {
    setSelectedColor(colorName);
    setColorPicked(true);
    if (variant) {
      setSelectedVariant(variant);
      setSelectedSize(cleanSizes(variant.sizes)[0] || '');
    }
  };

  // Fire-and-forget lead capture — only when we actually have contact info to
  // log (a logged-in customer); anonymous call/WhatsApp clicks still work,
  // they just don't create a tracked lead for the seller.
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

  const toggleHelpful = async (reviewId) => {
    if (!isAuthenticated) { toast.error('Please log in to mark a review helpful'); return; }
    try {
      const data = await reviewAPI.toggleHelpful(reviewId);
      setReviews(prev => prev.map(r => r._id === reviewId ? { ...r, helpfulCount: data.helpfulCount, isHelpful: data.isHelpful } : r));
    } catch (err) { toast.error(err.message || 'Could not update'); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) { toast.error('Please login to review'); return; }
    setSubmittingReview(true);
    try {
      const data = await reviewAPI.create({ productId: id, ...reviewForm });
      setReviews(prev => [data.review, ...prev]);
      setReviewForm({ rating: 5, title: '', comment: '', images: [], videos: [] });
      setReviewEligibility({ canReview: false, reason: 'already_reviewed' });
      toast.success('Review submitted!');
    } catch (err) {
      // Surfaces the backend's actual reason (e.g. "you can only review after
      // delivery") instead of a generic failure message.
      toast.error(err.message || 'Failed to submit review');
    }
    finally { setSubmittingReview(false); }
  };

  if (loading) {
    return (
      <div className={`${isStorefront ? 'storefront-light ' : ''}pt-6 min-h-screen bg-white dark:bg-gray-900 max-w-7xl mx-auto px-4 py-8`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <ProductCardSkeleton />
          <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton dark:bg-gray-700 h-8 rounded-xl" />)}</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className={`${isStorefront ? 'storefront-light ' : ''}pt-6 min-h-screen bg-white dark:bg-gray-900 text-center py-20 text-gray-500 dark:text-gray-400`}>Product not found</div>;
  }

  const inWishlist = isInWishlist(product._id);

  const handleAddToCart = () => {
    if (displaySizes.length > 0 && !selectedSize) { toast.error('Please select a size'); return; }
    // No login needed to add to cart (guest cart) — login is asked at checkout.
    // Colour products: the chosen colour, or none for the product itself.
    addToCart(product._id, 1, selectedSize, hasVariants ? (activeVariant?.colorName || '') : selectedColor);
  };

  // Save/Wishlist requires login — same rule as everywhere else in the app.
  const handleWishlistClick = () => {
    if (!isAuthenticated) { savePendingWishlist(product._id); navigate(isStorefront ? `${storeBasePath}/login` : '/login'); return; }
    if (user?.role !== 'user') {
      toast.error('Only customer accounts can save wishlist items.');
      return;
    }
    toggleWishlist(product._id);
  };

  return (
    <div className={`${isStorefront ? 'storefront-light ' : ''}pt-6 min-h-screen bg-white dark:bg-gray-900`}>
      {/* Lightbox */}
      <AnimatePresence>
        {lightboxStart !== null && (
          <Lightbox images={displayImages} startIndex={lightboxStart} onClose={() => setLightboxStart(null)} />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6 flex-wrap">
          <Link to={isStorefront ? storeBasePath : '/'} className="hover:text-blue-600 dark:hover:text-blue-400">Home</Link>
          <FiChevronRight className="w-3 h-3" />
          <Link to={isStorefront ? storeBasePath : `/shop/${product.category}`} className="hover:text-blue-600 dark:hover:text-blue-400 capitalize">{product.category}</Link>
          {product.subCategory && (
            <><FiChevronRight className="w-3 h-3" /><span>{product.subCategory}</span></>
          )}
          <FiChevronRight className="w-3 h-3" />
          <span className="text-gray-800 dark:text-gray-100 line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">

          {/* ─── Enhanced Image Gallery ─── */}
          <div className="lg:col-span-6">
            <div className="relative">
              <ImageGallery
                images={displayImages}
                selectedColor={selectedColor}
                onLightbox={(idx) => setLightboxStart(idx)}
                discount={discount}
                isFlashSaleActive={isFlashSaleActive && !hasVariants}
              />
              {/* Wishlist overlay */}
              <button
                onClick={handleWishlistClick}
                className={`absolute top-3 right-3 z-10 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all ${
                  inWishlist ? 'bg-blue-500 text-white' : 'bg-white/90 dark:bg-gray-900/90 text-gray-400 dark:text-gray-500 hover:text-blue-500'
                }`}
              >
                <FiHeart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* ─── Colours: a photo tile per colour ─── */}
            {(colorTiles.length > 1 || (colorTiles.length === 1 && product.images?.length > 0)) && (
              <div className="mt-5 pt-4 border-t border-gray-200 dark:border-white/10">
                <p className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
                  {colorTiles.length} {colorTiles.length === 1 ? 'Color' : 'Colors'}
                  {colorPicked && selectedColor && <span className="font-medium text-gray-500 dark:text-gray-400">: {selectedColor}</span>}
                </p>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {/* The product's own photos, so the shopper can switch back */}
                  {product.images?.length > 0 && (
                    <button type="button" onClick={() => { setColorPicked(false); setSelectedColor(''); setSelectedSize(cleanSizes(product.sizes)[0] || ''); }} title="Main photos" className="flex-shrink-0 flex flex-col items-center gap-1">
                      <span className={`block w-16 h-20 sm:w-20 sm:h-24 rounded-lg overflow-hidden border-2 transition-all ${
                        !colorPicked ? 'border-blue-600 ring-2 ring-blue-200 dark:ring-blue-500/30' : 'border-gray-200 dark:border-white/15 hover:border-gray-400'
                      }`}>
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      </span>
                      <span className={`text-xs ${!colorPicked ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Main</span>
                    </button>
                  )}
                  {colorTiles.map(tile => {
                    const isSelected = colorPicked && selectedColor === tile.name;
                    return (
                      <button key={tile.name} type="button" onClick={() => handleColorChange(tile.name, tile.variant)}
                        title={tile.name} className="flex-shrink-0 flex flex-col items-center gap-1">
                        <span className={`block w-16 h-20 sm:w-20 sm:h-24 rounded-lg overflow-hidden border-2 transition-all ${
                          isSelected ? 'border-blue-600 ring-2 ring-blue-200 dark:ring-blue-500/30' : 'border-gray-200 dark:border-white/15 hover:border-gray-400'
                        }`}>
                          {tile.image
                            ? <img src={tile.image} alt={tile.name} className="w-full h-full object-cover" />
                            : <span className="w-full h-full flex items-end justify-center pb-1" style={{ backgroundColor: COLOR_HEX[tile.name] || colorSwatch(tile.name) }} />}
                        </span>
                        <span className={`text-xs max-w-[5rem] truncate ${isSelected ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>{tile.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ─── Product Info ─── */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-wide">{product.brand}</span>
                {product.subCategory && <span className="bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">{product.subCategory}</span>}
                {product.productType && <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full">{product.productType}</span>}
              </div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">{product.name}</h1>
              <div className="flex items-center gap-4 mt-3">
                <RatingStars rating={product.ratings} size="md" />
                <span className="text-sm text-gray-500 dark:text-gray-400">{product.numReviews} ratings</span>
              </div>
            </div>

            {/* Price */}
            <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-200 dark:border-white/10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`price-${selectedColor}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-baseline gap-3 flex-wrap"
                >
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">{formatPrice(displayPrice)}</span>
                  {displayOriginalPrice && displayOriginalPrice > displayPrice && (
                    <span className="text-xl text-gray-400 dark:text-gray-500 line-through">{formatPrice(displayOriginalPrice)}</span>
                  )}
                  {discount > 0 && (
                    <span className="text-base text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-500/10 px-3 py-1 rounded-full">{discount}% off</span>
                  )}
                </motion.div>
              </AnimatePresence>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Inclusive of all taxes</p>
            </div>

            {/* Sizes */}
            {displaySizes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Size: <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedSize}</span></p>
                  <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">Size Guide</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {displaySizes.map(size => (
                    <button key={size} onClick={() => setSelectedSize(size)}
                      className={`min-w-12 px-4 py-2.5 text-sm rounded-xl border-2 font-semibold transition-all ${
                        selectedSize === size
                          ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-100 dark:shadow-blue-900/30'
                          : 'border-gray-200 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10'
                      }`}
                    >{size}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock */}
            <div className="flex items-center gap-4">
              <AnimatePresence mode="wait">
                <motion.span
                  key={`stock-${selectedColor}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-medium"
                >
                  {displayStock > 0 ? (
                    displayStock < 10
                      ? <span className="text-orange-600 dark:text-orange-400">Only {displayStock} left!</span>
                      : <span className="text-green-600 dark:text-green-400">In Stock ({displayStock})</span>
                  ) : <span className="text-blue-500 dark:text-blue-400 font-bold">Out of Stock</span>}
                </motion.span>
              </AnimatePresence>
            </div>

            {product.sellerId && product.sellerId.status === 'approved' ? (
              <div className="flex flex-wrap gap-3">
                {/* Seller products are bought only inside the seller's own
                    store; the main website just connects the shopper to it. */}
                {isStorefront ? (
                  <button
                    onClick={handleAddToCart}
                    disabled={cartLoading || displayStock <= 0}
                    className="flex-1 min-w-[170px] h-14 flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 shadow-sm shadow-blue-200/50 dark:shadow-blue-900/30"
                  >
                    <FiShoppingBag className="w-5 h-5" /> {displayStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                ) : product.sellerId.shopSlug && (
                  <a
                    href={getStoreUrl(product.sellerId.shopSlug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[170px] h-14 flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-all shadow-sm shadow-blue-200/50 dark:shadow-blue-900/30"
                  >
                    Visit {product.sellerId.shopName || 'Store'}
                  </a>
                )}
                {product.sellerId.phone && <a href={`tel:${product.sellerId.phone}`} onClick={() => logLead('click_to_call')} title="Call seller" aria-label="Call seller"
                  className="h-14 w-14 flex items-center justify-center rounded-xl border-2 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all">
                  <FiPhoneCall className="w-5 h-5" />
                </a>}
                {(product.sellerId.whatsapp || product.sellerId.phone) && <a href={`https://wa.me/${toWhatsappNumber(product.sellerId.whatsapp || product.sellerId.phone)}?text=${encodeURIComponent(`Hi, I'm interested in "${product.name}" — is it available?`)}`}
                  target="_blank" rel="noreferrer" onClick={() => logLead('whatsapp')} title="WhatsApp seller" aria-label="WhatsApp seller"
                  className="h-14 w-14 flex items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-sm">
                  <FaWhatsapp className="w-5 h-5" />
                </a>}
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={cartLoading || displayStock <= 0}
                  className="flex-[2] h-14 flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 shadow-sm shadow-blue-200/50 dark:shadow-blue-900/30"
                >
                  <FiShoppingBag className="w-5 h-5" /> {displayStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
                <button
                  onClick={handleWishlistClick}
                  className={`flex-1 h-14 flex items-center justify-center gap-2 rounded-xl border-2 font-semibold text-sm transition-all ${
                    inWishlist ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:text-blue-400'
                  }`}
                >
                  <FiHeart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} /> {inWishlist ? 'Saved' : 'Save'}
                </button>
                <button className="p-4 rounded-xl border-2 border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-all h-14 w-14 flex items-center justify-center dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:text-blue-400">
                  <FiShare2 className="w-5 h-5" />
                </button>
              </div>
            )}

            {product.sellerId && product.sellerId.status === 'approved' && (
              <div className="mt-4 bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-200 dark:border-white/10">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <FiShoppingBag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Listed by
                </p>
                <a
  href={getStoreUrl(product.sellerId.shopSlug)}
  target="_blank"
  rel="noopener noreferrer"
  className="flex items-center gap-3 mb-4 group"
>
  {product.sellerId.logo ? (
    <img
      src={product.sellerId.logo}
      alt={product.sellerId.shopName}
      className="h-11 w-auto object-contain flex-shrink-0"
    />
  ) : (
    <span className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold flex-shrink-0">
      {product.sellerId.shopName?.charAt(0)}
    </span>
  )}

  <span className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
    {product.sellerId.shopName}
  </span>
</a>

              </div>
            )}

          </div>
        </div>

        <JewellerySpecs product={product} />

        {/* ─── Tabs ─── */}
        <div className="bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm mb-12">
          <div className="flex border-b border-gray-200 dark:border-white/10">
            {[
              { id: 'description', label: 'Description' },
              { id: 'reviews', label: `Reviews (${reviews.length})` },
              { id: 'details', label: 'Product Details' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${
                  activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'description' && (
              <div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base">{product.description}</p>
                {product.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-5">
                    {product.tags.map(tag => (
                      <span key={tag} className="text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full font-medium border border-blue-200 dark:border-blue-500/20">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'details' && (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Brand', value: product.brand },
                  { label: 'Category', value: product.category },
                  { label: 'Sub-Category', value: product.subCategory },
                  { label: 'Type', value: product.productType },
                  { label: 'SKU', value: hasVariants && selectedVariant ? selectedVariant.sku : product.sku },
                  { label: 'Available Sizes', value: displaySizes.join(', ') || product.sizes?.join(', ') },
                  { label: 'Available Colors', value: hasVariants ? activeVariants.map(v => v.colorName).join(', ') : product.colors?.join(', ') },
                  { label: 'Stock', value: `${displayStock} units` },
                ].filter(i => i.value).map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-1 p-3 bg-white dark:bg-white/5 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 capitalize">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                {reviews.length > 0 && (
                  <div className="max-w-3xl mb-8 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
                    {(showAllReviews ? reviews : reviews.slice(0, REVIEWS_PREVIEW_COUNT)).map((review, idx) => (
                      <div key={review._id} className={`p-5 sm:p-6 ${idx > 0 ? 'border-t border-gray-200 dark:border-white/10' : ''}`}>
                        <div className="flex items-center gap-3">
                          {review.user?.avatar ? (
                            <img src={review.user.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <span className="w-9 h-9 rounded-full bg-blue-50 dark:bg-white/10 text-blue-400 flex items-center justify-center flex-shrink-0">
                              <FiUser className="w-5 h-5" />
                            </span>
                          )}
                          <p className="font-semibold text-gray-700 dark:text-gray-200 truncate">{review.user?.name || 'Customer'}</p>
                        </div>

                        <div className="flex items-center gap-2 mt-3 text-sm">
                          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-bold text-white ${review.rating >= 4 ? 'bg-green-600' : review.rating === 3 ? 'bg-amber-500' : 'bg-red-500'}`}>
                            {Number(review.rating).toFixed(1)} <FiStar className="w-3.5 h-3.5 fill-current" />
                          </span>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Posted on {formatDateShort(review.createdAt)}</span>
                        </div>

                        {review.title && <p className="font-semibold text-gray-800 dark:text-gray-100 mt-3">{review.title}</p>}
                        {review.comment && <p className={`text-gray-700 dark:text-gray-300 leading-relaxed break-words ${review.title ? 'mt-1' : 'mt-3'}`}>{review.comment}</p>}

                        <ReviewMedia images={review.images} videos={review.videos} size="lg" className="mt-3" />

                        <button type="button" onClick={() => toggleHelpful(review._id)}
                          className={`mt-4 inline-flex items-center gap-2 text-sm font-medium transition-colors ${review.isHelpful ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                          <FiThumbsUp className={`w-5 h-5 ${review.isHelpful ? 'fill-current' : ''}`} />
                          Helpful ({review.helpfulCount || 0})
                        </button>
                      </div>
                    ))}

                    {reviews.length > REVIEWS_PREVIEW_COUNT && (
                      <button type="button" onClick={() => setShowAllReviews(v => !v)}
                        className="w-full flex items-center gap-1 px-5 sm:px-6 py-4 border-t border-gray-200 dark:border-white/10 text-sm font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        {showAllReviews ? 'Show fewer reviews' : `View all reviews (${reviews.length})`}
                        <FiChevronRight className={`w-4 h-4 transition-transform ${showAllReviews ? '-rotate-90' : 'rotate-90'}`} />
                      </button>
                    )}
                  </div>
                )}
                {reviews.length === 0 && (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-500">
                    <p className="text-4xl mb-3">⭐</p>
                    <p className="font-medium">No reviews yet. Be the first to review!</p>
                  </div>
                )}
                {!isAuthenticated && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-200 dark:border-white/10 text-center">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">Log in to write a review.</p>
                    <Link to="/login" className="inline-block text-blue-600 dark:text-blue-400 font-semibold text-sm hover:underline">Log In</Link>
                  </div>
                )}

                {isAuthenticated && reviewEligibility?.canReview === false && reviewEligibility.reason === 'already_reviewed' && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-200 dark:border-white/10 text-center">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">You've already reviewed this product. Thanks for the feedback!</p>
                  </div>
                )}

                {isAuthenticated && reviewEligibility?.canReview === false && reviewEligibility.reason === 'not_purchased' && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-200 dark:border-white/10 text-center">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Buy this product and wait for delivery to leave a review.</p>
                  </div>
                )}

                {isAuthenticated && reviewEligibility?.canReview && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-200 dark:border-white/10">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">Write a Review</h3>
                    <form onSubmit={submitReview} className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Your Rating</label>
                        <div className="flex gap-2">
                          {[1,2,3,4,5].map(star => (
                            <button key={star} type="button"
                              onClick={() => setReviewForm(p => ({ ...p, rating: star }))}
                              className={`text-3xl transition-all hover:scale-110 ${star <= reviewForm.rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                            >★</button>
                          ))}
                        </div>
                      </div>
                      <input type="text" placeholder="Review title" value={reviewForm.title}
                        onChange={e => setReviewForm(p => ({ ...p, title: e.target.value }))}
                        required className="input-field dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" />
                      <textarea placeholder="Share your experience with this product..."
                        value={reviewForm.comment}
                        onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                        required rows={4} className="input-field resize-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" />
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Add Photos / Videos (optional)</label>
                        <ReviewMediaUploader
                          images={reviewForm.images}
                          videos={reviewForm.videos}
                          onChange={(m) => setReviewForm(p => ({ ...p, ...m }))}
                        />
                      </div>
                      <Button type="submit" loading={submittingReview} variant="primary">Submit Review</Button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}