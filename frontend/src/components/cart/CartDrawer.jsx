import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiShoppingCart, FiTrash2, FiPlus, FiMinus, FiArrowRight } from 'react-icons/fi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { formatPrice, getEffectiveProductPrice, getEffectiveOriginalPrice, getColorImage } from '../../utils/helpers';
import { getStoreSlugFromPath, getStorePath } from '../../utils/subdomain';
import Button from '../ui/Button';

export default function CartDrawer() {
  const { cart, isOpen, closeCart, updateQuantity, removeItem, isGuestCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const isGuest = isGuestCart();
  const navigate = useNavigate();
  const location = useLocation();
  const storeSlug = getStoreSlugFromPath(location.pathname);
  const storeBasePath = storeSlug ? getStorePath(storeSlug) : '';

  // Esc closes the drawer; the page behind it shouldn't scroll while it's open.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeCart(); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, closeCart]);

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || getEffectiveProductPrice(item.product)) * item.quantity, 0);
  const shipping = items.reduce((sum, item) => (
    sum + Math.max(Number(item.product?.deliveryCharge || 0), 0) * Number(item.quantity || 1)
  ), 0);

  const handleCheckout = () => {
    closeCart();
    if (!isAuthenticated) {
      navigate(storeBasePath ? `${storeBasePath}/login` : '/login');
      return;
    }
    if (user?.role !== 'user') {
      toast.error('Only customer accounts can checkout.');
      navigate(storeBasePath || '/');
      return;
    }
    navigate(storeBasePath ? `${storeBasePath}/checkout` : '/checkout');
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeCart} className="fixed inset-0 bg-black/50 z-[200] backdrop-blur-sm" />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 z-[210] shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <FiShoppingCart className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Shopping Cart</h2>
                {items.length > 0 && (
                  <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full">{items.length}</span>
                )}
              </div>
              <button onClick={closeCart} aria-label="Close cart" title="Close" className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:rotate-90 transition-all duration-200">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Free shipping bar */}
            {subtotal < 999 && subtotal > 0 && (
              <div className="px-5 py-3 bg-blue-50 dark:bg-blue-500/10">
                <div className="flex justify-between text-xs text-blue-700 dark:text-blue-300 mb-1">
                  <span>Add {formatPrice(999 - subtotal)} more for free delivery!</span>
                  <span>{Math.round((subtotal / 999) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-blue-200 dark:bg-blue-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-blue-500 rounded-full transition-all duration-500" style={{ width: `${Math.min((subtotal / 999) * 100, 100)}%` }} />
                </div>
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <FiShoppingCart className="w-12 h-12 text-amber-700 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Your cart is empty</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Add items to get started</p>
                  <Link to="/" onClick={closeCart}>
                    <Button variant="primary">Start Shopping</Button>
                  </Link>
                </div>
              ) : (
                <AnimatePresence>
                  {items.map((item) => {
                    const product = item.product || {};
                    const price = Number(item.price) || getEffectiveProductPrice(product);
                    const variant = (product.variants || []).find((entry) => entry.colorName === item.color);
                    const listedPrice = getEffectiveOriginalPrice(product, variant);
                    const originalPrice = listedPrice ?? (
                      product.isFlashSale && price < Number(product.price) ? Number(product.price) : null
                    );
                    return (
                      <motion.div key={item._id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">
                        <img src={getColorImage(product, item.color) || item.image} alt={product.name || item.name}
                          className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-800 dark:text-gray-100 line-clamp-2 mb-1">{product.name || item.name}</h4>
                          <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                            {item.size && <span className="bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">{item.size}</span>}
                            {item.color && <span className="bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">{item.color}</span>}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex flex-wrap items-baseline gap-1.5">
                              <strong className="font-bold text-gray-900 dark:text-gray-100">{formatPrice(price)}</strong>
                              {originalPrice > price && (
                                <del className="text-xs font-normal text-gray-400">{formatPrice(originalPrice)}</del>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQuantity(item._id, item.quantity - 1)}
                                className="w-6 h-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <FiMinus className="w-3 h-3" />
                              </button>
                              <span className="text-sm font-semibold w-6 text-center text-gray-800 dark:text-gray-100">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item._id, item.quantity + 1)}
                                className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                                <FiPlus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Total: {formatPrice(price * item.quantity)}</span>
                            <button onClick={() => removeItem(item._id)} className="text-blue-400 hover:text-blue-600 transition-colors">
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-5 border-t border-gray-100 dark:border-gray-800 space-y-4 bg-white dark:bg-gray-900">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Shipping</span>
                    <span className={shipping === 0 ? 'text-green-600 dark:text-green-400 font-medium' : ''}>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 text-base pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span>Total</span><span>{formatPrice(subtotal + shipping)}</span>
                  </div>
                </div>
                <Button variant="primary" fullWidth onClick={handleCheckout} size="lg">
                  {isGuest ? 'Login & Checkout' : 'Proceed to Checkout'} <FiArrowRight className="w-4 h-4" />
                </Button>
                {isGuest && (
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400">Your cart is saved — log in to place the order and it moves to your account.</p>
                )}
                <button onClick={closeCart} className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Continue Shopping</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}