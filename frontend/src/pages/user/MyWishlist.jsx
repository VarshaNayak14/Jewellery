import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiArrowRight, FiX, FiAward } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useWishlistStore } from '../../store/wishlistStore';
import { getEffectiveOriginalPrice, getEffectiveProductPrice } from '../../utils/helpers';
import { METAL_LABEL, formatINR } from '../../utils/jewellery';

export default function MyWishlist() {
  const { wishlist, fetchWishlist, removeFromWishlist } = useWishlistStore();
  const items = wishlist?.products || [];
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist().finally(() => setLoading(false));
  }, []);

  const handleRemove = async (productId) => {
    try {
      await removeFromWishlist(productId);
      toast.success('Removed from wishlist');
    } catch (err) { toast.error(err.message); }
  };

  const wishlistItems = Array.isArray(items) ? items : [];

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <span className="sec-eyebrow !mb-1 !text-[11px]">Saved for later</span>
          <h2 className="text-2xl font-semibold text-[#660032] dark:text-[#fff8ea]">My Wishlist</h2>
        </div>
        <span className="text-sm text-[#7d6d55] dark:text-[#bfae92]">{wishlistItems.length} piece{wishlistItems.length === 1 ? '' : 's'}</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="aspect-[4/5] rounded-3xl bg-[#f5ecd9] dark:bg-white/5 animate-pulse" />)}
        </div>
      ) : wishlistItems.length === 0 ? (
        <div className="text-center py-14 px-6 rounded-3xl bg-[#fffdf8] dark:bg-[#1e1913] border border-dashed border-[rgba(169,131,69,0.35)]">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-[#f5ecd9] dark:bg-[#a98345]/20 text-[#a98345]">
            <FiHeart className="w-6 h-6" />
          </div>
          <p className="font-semibold text-[#2f2619] dark:text-white">Nothing saved yet</p>
          <p className="text-sm text-[#7d6d55] dark:text-[#bfae92] mt-1">Tap the heart on any piece to keep it here.</p>
          <Link to="/shop" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[linear-gradient(100deg,#b8904f,#8b6835)]">
            Explore jewellery <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlistItems.map((item) => {
            const product = item.product || item;
            const price = getEffectiveProductPrice(product);
            const original = getEffectiveOriginalPrice(product);
            const j = product.jewellery;
            return (
              <article key={item._id || product._id} className="group rounded-3xl overflow-hidden bg-[#fffdf8] dark:bg-[#1e1913] border border-[rgba(169,131,69,0.22)] dark:border-[rgba(218,190,138,0.15)]">
                <div className="relative aspect-square bg-[#f5ecd9] dark:bg-white/5 overflow-hidden">
                  <Link to={`/product/${product._id}`}>
                    <img src={product.images?.[0] || product.variants?.[0]?.images?.[0]} alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </Link>
                  <button onClick={() => handleRemove(product._id)} aria-label="Remove from wishlist"
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-[#6b4c26] flex items-center justify-center shadow hover:bg-white">
                    <FiX className="w-4 h-4" />
                  </button>
                  {j?.hallmarked && (
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-white/90 text-[#6b4c26]">
                      <FiAward className="w-3 h-3" /> Hallmarked
                    </span>
                  )}
                </div>
                <div className="p-4">
                  {j?.metal && (
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[#a98345] mb-1">
                      {j.purity} {METAL_LABEL[j.metal] || j.metal}{j.netWeight ? ` · ${j.netWeight}g` : ''}
                    </p>
                  )}
                  <Link to={`/product/${product._id}`} className="block font-medium text-sm text-[#2f2619] dark:text-white line-clamp-2 hover:underline decoration-[#c99a52]">
                    {product.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-semibold text-[#2f2619] dark:text-white">{formatINR(price)}</span>
                    {original && original > price && <span className="text-xs text-[#a8977b] line-through">{formatINR(original)}</span>}
                  </div>
                  <Link to={`/product/${product._id}`}
                    className="mt-3 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[linear-gradient(100deg,#b8904f,#8b6835)] hover:brightness-105">
                    View piece <FiArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
