import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHeart, FiShoppingCart, FiTrash2, FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useWishlistStore } from '../../store/wishlistStore';
import { useCartStore } from '../../store/cartStore';
import { getEffectiveOriginalPrice, getEffectiveProductPrice } from '../../utils/helpers';

export default function MyWishlist() {
  const { items, fetchWishlist, removeFromWishlist } = useWishlistStore();
  const { addToCart } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState({});

  useEffect(() => {
    fetchWishlist().finally(() => setLoading(false));
  }, []);

  const handleAddToCart = async (product) => {
    setAddingToCart(p => ({ ...p, [product._id]: true }));
    try {
      await addToCart({ productId: product._id, quantity: 1, size: product.sizes?.[0], color: product.colors?.[0] });
      toast.success('Added to cart!');
    } catch (err) { toast.error(err.message); }
    finally { setAddingToCart(p => ({ ...p, [product._id]: false })); }
  };

  const handleRemove = async (productId) => {
    try {
      await removeFromWishlist(productId);
      toast.success('Removed from wishlist');
    } catch (err) { toast.error(err.message); }
  };

  const discount = (orig, price) => orig > price ? Math.round(((orig - price) / orig) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Wishlist</h2>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
        </div>
        {items.length > 0 && (
          <Link to="/shop" className="flex items-center gap-1 text-sm font-semibold text-rose-500 hover:text-rose-600 transition-colors">
            Shop More <FiArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded-full w-3/4" />
                <div className="h-4 bg-gray-100 rounded-full w-1/2" />
                <div className="h-8 bg-gray-100 rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 bg-white rounded-3xl border border-gray-100">
          <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <FiHeart className="w-9 h-9 text-rose-300" />
          </div>
          <p className="font-bold text-gray-700 mb-1">Your wishlist is empty</p>
          <p className="text-sm text-gray-400 mb-5">Save items you love for later</p>
          <Link to="/shop"
            className="inline-flex items-center gap-2 bg-rose-500 text-white px-6 py-2.5 rounded-2xl text-sm font-semibold hover:bg-rose-600 transition-colors shadow-md shadow-rose-200">
            Explore Products <FiArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <AnimatePresence>
            {items.map((item, idx) => {
              const product = item.product || item;
              const effectivePrice = getEffectiveProductPrice(product);
              const originalPrice = getEffectiveOriginalPrice(product);
              const disc = originalPrice && originalPrice > effectivePrice ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100) : 0;
              return (
                <motion.div key={item._id || product._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group">

                  {/* Image */}
                  <div className="relative">
                    <Link to={`/product/${product._id}`}>
                      <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
                        {product.images?.[0]
                          ? <img src={product.images[0]} alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <FiHeart className="w-8 h-8 text-gray-300" />
                            </div>}
                      </div>
                    </Link>

                    {/* Discount Badge */}
                    {disc > 0 && (
                      <span className="absolute top-2.5 left-2.5 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-xl shadow-sm">
                        -{disc}%
                      </span>
                    )}

                    {/* Remove Button */}
                    <button onClick={() => handleRemove(product._id)}
                      className="absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-sm border border-gray-100 text-gray-500 hover:text-blue-500 hover:border-blue-200 transition-all">
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <Link to={`/product/${product._id}`}>
                      <h3 className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug hover:text-rose-500 transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="flex items-baseline gap-1.5 mt-1.5">
                      <span className="text-sm font-bold text-gray-900">₹{effectivePrice}</span>
                      {originalPrice && originalPrice > effectivePrice && (
                        <span className="text-xs text-gray-400 line-through">₹{originalPrice}</span>
                      )}
                    </div>

                    <button onClick={() => handleAddToCart(product)}
                      disabled={addingToCart[product._id]}
                      className="w-full mt-2.5 flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-2xl text-xs font-semibold transition-all disabled:opacity-60 shadow-sm shadow-rose-200 active:scale-95">
                      {addingToCart[product._id]
                        ? <span className="flex items-center gap-1.5"><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Adding...</span>
                        : <><FiShoppingCart className="w-3.5 h-3.5" /> Add to Cart</>}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}