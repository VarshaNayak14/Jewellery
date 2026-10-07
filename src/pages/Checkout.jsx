import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiTruck, FiCreditCard, FiShoppingBag, FiDollarSign, FiUpload } from 'react-icons/fi';
import { FaQrcode } from 'react-icons/fa';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';
import { orderAPI, paymentAPI, uploadAPI } from '../services/api';
import { formatPrice, calculateTax, getEffectiveProductPrice, getColorImage } from '../utils/helpers';
import Button from '../components/ui/Button';
import AddressFields, { EMPTY_ADDRESS, fromSavedAddress, validateAddress, withStreet } from '../components/common/AddressFields';
import toast from 'react-hot-toast';

const STEPS = ['Cart Review', 'Shipping', 'Payment'];

const totalsOf = (list) => {
  const subtotal = list.reduce((s, i) => s + ((Number(i.price) || getEffectiveProductPrice(i.product)) * i.quantity), 0);
  const shipping = list.reduce((sum, item) => (
    sum + Math.max(Number(item.product?.deliveryCharge || 0), 0) * Number(item.quantity || 1)
  ), 0);
  const tax = calculateTax(subtotal);
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
};

// Each seller is paid directly, so a cart with products from several sellers
// becomes one order + one payment per seller. Admin-catalog products are split
// the same way by the Admin / Super Admin who owns them (adminGroups, from the
// server), each with that owner's own payment details.
const groupBySeller = (list, adminGroups = []) => {
  const groups = [];
  for (const item of list) {
    const seller = item.product?.sellerId;
    const productId = String(item.product?._id || item.product);
    const adminGroup = !seller && adminGroups.find(g => g.productIds.includes(productId));
    const key = seller?._id || (adminGroup ? `admin:${adminGroup.owner || 'none'}` : 'platform');
    let group = groups.find(g => g.key === key);
    if (!group) {
      group = {
        key,
        name: seller?.shopName || (adminGroup?.details?.name ? `growthkarts · ${adminGroup.details.name}` : 'growthkarts'),
        adminTarget: adminGroup?.available ? adminGroup.details : null,
        items: [],
      };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
};

export default function Checkout() {
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [pinInfo, setPinInfo] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState('');
  const [uploadingPaymentScreenshot, setUploadingPaymentScreenshot] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('razorpay');

  const { cart, fetchCart } = useCartStore();
  const { user } = useAuthStore();
  const { wallet, fetchWallet } = useWalletStore();
  const navigate = useNavigate();

  useEffect(() => { fetchWallet(); }, []);

  const allItems = cart?.items || [];
  // Who owns each admin-catalog product in the cart (Admin vs Super Admin).
  const [adminGroups, setAdminGroups] = useState([]);
  const platformIdsKey = allItems.filter(i => !i.product?.sellerId).map(i => i.product?._id || i.product).join(',');
  useEffect(() => {
    if (!platformIdsKey) { setAdminGroups([]); return; }
    let cancelled = false;
    orderAPI.getAdminPaymentGroups(platformIdsKey.split(','))
      .then(d => { if (!cancelled) setAdminGroups(d.groups || []); })
      .catch(() => { if (!cancelled) setAdminGroups([]); });
    return () => { cancelled = true; };
  }, [platformIdsKey]);
  const groups = useMemo(() => groupBySeller(allItems, adminGroups), [allItems, adminGroups]);
  const [activeKey, setActiveKey] = useState(null);
  const [placedOrders, setPlacedOrders] = useState([]);
  // The seller group being paid right now; every amount below is for it only.
  const activeGroup = groups.find(g => g.key === activeKey) || groups[0];
  const items = activeGroup?.items || [];
  const { subtotal, shipping, tax, total } = totalsOf(items);
  const cartTotal = totalsOf(allItems).total;
  const walletBalance = wallet?.balance || 0;
  const walletAmountUsed = useWallet ? Math.min(walletBalance, total) : 0;
  const payableAmount = total - walletAmountUsed;
  const walletCoversOrder = payableAmount <= 0;
  const firstSeller = items[0]?.product?.sellerId;
  const sellerCheckout = Boolean(firstSeller && items.every(item => item.product?.sellerId?._id === firstSeller._id));
  const sellerPaymentReady = sellerCheckout && firstSeller.status === 'approved'
    && firstSeller.kyc?.status === 'approved' && Boolean(firstSeller.upiId || firstSeller.qrCodeImage)
    // "Direct UPI / QR payment" must be part of the seller's plan (enforced on the server too).
    && firstSeller.planSnapshot?.capabilities?.directPayment !== false;
  // Admin / Super Admin products: online payment goes to the owning admin's saved details.
  const adminTarget = activeGroup?.adminTarget || null;
  const adminCheckout = Boolean(adminTarget);
  const codAvailable = items.length > 0 && items.every(item => item.product?.codAvailable !== false);

  // Fresh payment form whenever the seller being paid changes.
  useEffect(() => {
    setSelectedPaymentMethod(sellerCheckout ? 'seller_direct' : (adminCheckout ? 'admin_direct' : 'razorpay'));
    setPaymentReference('');
    setPaymentScreenshot('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup?.key, sellerCheckout, adminCheckout]);

  // One seller's order is placed — move on to the next seller, or finish.
  const finishGroup = async (order) => {
    const done = [...placedOrders, order];
    setPlacedOrders(done);
    setUseWallet(false);
    setPlacingOrder(false);
    fetchWallet();
    await fetchCart();
    if (groups.length > 1) {
      toast.success(`Order placed with ${activeGroup.name}. Now complete the payment for the next seller.`);
      setActiveKey(null);
      return;
    }
    navigate(done.length > 1 ? '/my-account/orders' : `/order-confirmation/${order._id}`);
  };

  useEffect(() => {
    if (user?.addresses?.length > 0) {
      const def = user.addresses.find(a => a.isDefault) || user.addresses[0];
      setAddress(fromSavedAddress({ ...def, name: def.name || user.name, phone: def.phone || user.phone || '' }));
    } else {
      setAddress(a => ({ ...a, name: user?.name || '', phone: user?.phone || '' }));
    }
  }, [user]);

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    const error = validateAddress(address, pinInfo);
    if (error) { toast.error(error); return; }
    setStep(2);
  };

  const handlePayment = async () => {
    if (!walletCoversOrder && selectedPaymentMethod === 'seller_direct' && !sellerPaymentReady) {
      toast.error('Seller payment details are not verified yet');
      return;
    }
    if (!walletCoversOrder && selectedPaymentMethod === 'seller_direct' && !paymentReference.trim()) {
      toast.error('Enter the UTR or payment reference after paying the seller');
      return;
    }
    if (!walletCoversOrder && selectedPaymentMethod === 'seller_direct' && !paymentScreenshot) {
      toast.error('Upload the payment screenshot after paying the seller');
      return;
    }
    if (!walletCoversOrder && selectedPaymentMethod === 'admin_direct') {
      if (!adminCheckout) { toast.error('Payment details are not available for these items'); return; }
      if (!paymentReference.trim()) { toast.error('Enter the UTR or payment reference after paying'); return; }
      if (!paymentScreenshot) { toast.error('Upload the payment screenshot after paying'); return; }
    }
    setPlacingOrder(true);
    try {
      const orderItems = items.map(i => ({
        product: i.product._id || i.product,
        name: i.product.name,
        image: getColorImage(i.product, i.color),
        price: Number(i.price) || getEffectiveProductPrice(i.product),
        size: i.size,
        color: i.color,
        quantity: i.quantity,
      }));

      const orderData = await orderAPI.create({
        items: orderItems,
        shippingAddress: withStreet(address),
        itemsPrice: subtotal,
        shippingPrice: shipping,
        taxPrice: tax,
        totalPrice: total,
        walletAmountUsed,
        paymentMethod: walletCoversOrder ? 'wallet' : selectedPaymentMethod,
        paymentReference: !walletCoversOrder && (selectedPaymentMethod === 'seller_direct' || selectedPaymentMethod === 'admin_direct') ? paymentReference.trim() : undefined,
        paymentScreenshot: !walletCoversOrder && (selectedPaymentMethod === 'seller_direct' || selectedPaymentMethod === 'admin_direct') ? paymentScreenshot : undefined,
      });

      // Wallet balance fully covered the order — no gateway step needed.
      if (orderData.order.isPaid) {
        toast.success('Paid using wallet balance!');
        await finishGroup(orderData.order);
        return;
      }

      if (selectedPaymentMethod === 'seller_direct' || selectedPaymentMethod === 'admin_direct' || selectedPaymentMethod === 'cod') {
        if (selectedPaymentMethod === 'seller_direct' && !sellerPaymentReady) throw new Error('Seller payment details are not verified yet');
        toast.success(selectedPaymentMethod === 'cod' ? 'COD order placed successfully!' : selectedPaymentMethod === 'admin_direct' ? 'Order submitted. Your payment will be verified shortly.' : 'Order submitted. Seller will verify your payment shortly.');
        await finishGroup(orderData.order);
        return;
      }

      const remainingAmount = orderData.remainingAmount ?? total;
      const paymentData = await paymentAPI.createOrder({ amount: remainingAmount, orderId: orderData.order._id });

      const options = {
        key: paymentData.key,
        amount: paymentData.amount,
        currency: paymentData.currency,
        name: 'growthkarts',
        description: `Order #${orderData.order.orderNumber}`,
        image: '/growthkart-logo.svg',
        order_id: paymentData.razorpayOrderId,
        handler: async (response) => {
          try {
            await paymentAPI.verify({ ...response, orderId: orderData.order._id });
            toast.success('Payment successful!');
            await finishGroup(orderData.order);
          } catch { toast.error('Payment verification failed'); }
        },
        prefill: { name: user?.name, email: user?.email, contact: user?.phone || address.phone },
        theme: { color: '#9333ea' },
        modal: { ondismiss: () => { setPlacingOrder(false); toast('Payment cancelled'); } },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      toast.error(err.message || 'Failed to place order');
      setPlacingOrder(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FiShoppingBag className="w-12 h-12 text-amber-700 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Your cart is empty</h2>
          <Button variant="primary" onClick={() => navigate('/shop')}>Start Shopping</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Checkout</h1>

        {/* Steps */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-2 ${i <= step ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 ring-2 ring-blue-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                  {i < step ? <FiCheck className="w-4 h-4" /> : i + 1}
                </div>
                <span className="font-medium text-sm hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-4 transition-all ${i < step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} style={{ width: '60px' }} />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* Step 0: Cart review */}
              {step === 0 && (
                <motion.div key="cart" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="bg-white dark:bg-gray-800/60 rounded-3xl p-6 shadow-sm">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-lg mb-5 flex items-center gap-2"><FiShoppingBag className="text-blue-600 dark:text-blue-400" /> Order Items ({allItems.length})</h2>
                  {groups.length > 1 && (
                    <p className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl px-4 py-3 mb-5">
                      Your cart has products from {groups.length} sellers. Each seller gets a separate order and you pay each seller separately.
                    </p>
                  )}
                  {groups.map(group => (
                  <div key={group.key} className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{group.name}</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatPrice(totalsOf(group.items).total)}</p>
                    </div>
                  <div className="space-y-4">
                    {group.items.map(item => (
                      <div key={item._id} className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                        <img src={getColorImage(item.product, item.color)} alt={item.product?.name} className="w-20 h-20 object-cover rounded-xl" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 dark:text-gray-100 text-sm line-clamp-2">{item.product?.name}</p>
                          <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {item.size && <span>Size: {item.size}</span>}
                            {item.color && <span>• {item.color}</span>}
                            <span>• Qty: {item.quantity}</span>
                          </div>
                          <p className="font-bold text-gray-900 dark:text-gray-100 mt-1">{formatPrice((Number(item.price) || getEffectiveProductPrice(item.product)) * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  </div>
                  ))}

                  <Button variant="primary" fullWidth size="lg" onClick={() => setStep(1)} className="mt-6">Continue to Shipping</Button>
                </motion.div>
              )}

              {/* Step 1: Address */}
              {step === 1 && (
                <motion.div key="shipping" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="bg-white dark:bg-gray-800/60 rounded-3xl p-6 shadow-sm">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-lg mb-5 flex items-center gap-2"><FiTruck className="text-blue-600 dark:text-blue-400" /> Shipping Address</h2>
                  <form onSubmit={handleAddressSubmit} className="space-y-4">
                    <AddressFields value={address} onChange={setAddress} onPinInfo={setPinInfo} />
                    <div className="flex gap-3 mt-2">
                      <Button variant="ghost" onClick={() => setStep(0)} type="button">← Back</Button>
                      <Button variant="primary" type="submit" fullWidth size="lg">Continue to Payment</Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 2: Payment */}
              {step === 2 && (
                <motion.div key="payment" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="bg-white dark:bg-gray-800/60 rounded-3xl p-6 shadow-sm">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-lg mb-5 flex items-center gap-2"><FiCreditCard className="text-blue-600 dark:text-blue-400" /> Payment</h2>

                  {(groups.length > 1 || placedOrders.length > 0) && (
                    <div className="mb-5">
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {placedOrders.length > 0 && <span className="text-green-600 dark:text-green-400 font-medium">{placedOrders.length} order{placedOrders.length > 1 ? 's' : ''} placed. </span>}
                        {groups.length > 1 ? `Pay each seller separately — ${groups.length} payments left:` : 'Last payment:'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {groups.map((group, i) => (
                          <button key={group.key} type="button" onClick={() => setActiveKey(group.key)} disabled={placingOrder}
                            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${group.key === activeGroup?.key ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
                            {i + 1}. {group.name} · {formatPrice(totalsOf(group.items).total)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-4 mb-6">
                    <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">Delivering to:</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">{address.name} • {address.phone}</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">{[address.houseNo, address.area, address.city, address.district, address.state].filter(Boolean).join(', ')} - {address.pincode}</p>
                  </div>

                  {walletBalance > 0 && (
                    <button type="button" onClick={() => setUseWallet(w => !w)}
                      className={`w-full flex items-center justify-between gap-3 border rounded-2xl p-4 mb-4 transition-colors ${useWallet ? 'border-blue-400 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 ${useWallet ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}>
                          {useWallet && <FiCheck className="w-3 h-3 text-white" />}
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-800 dark:text-gray-100 flex items-center gap-2"><FiDollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Use Wallet Balance</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Available: {formatPrice(walletBalance)}</p>
                        </div>
                      </div>
                      {useWallet && <span className="text-sm font-bold text-blue-600 dark:text-blue-400">-{formatPrice(walletAmountUsed)}</span>}
                    </button>
                  )}

                  {adminCheckout && selectedPaymentMethod === 'admin_direct' ? (
                    <div className="border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl p-4 mb-6">
                      <p className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 mb-2">
                        <FaQrcode className="text-indigo-600 dark:text-indigo-400" /> Pay {adminTarget.name} directly
                      </p>
                      <p className="text-sm text-indigo-700 dark:text-indigo-400 mb-4">Scan the QR, use the UPI ID or bank transfer below. After paying {formatPrice(payableAmount)}, enter the UTR/reference number.</p>
                      {adminTarget.qrCodeImage && <img src={adminTarget.qrCodeImage} alt="UPI QR" className="w-44 h-44 object-contain bg-white rounded-xl p-2 mx-auto mb-3" />}
                      {adminTarget.upiId && <p className="text-center font-mono font-bold text-indigo-900 dark:text-indigo-200 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 mb-3">{adminTarget.upiId}</p>}
                      {adminTarget.accountNumber && (
                        <div className="text-sm bg-white dark:bg-gray-800 rounded-lg px-3 py-2 mb-3 text-gray-700 dark:text-gray-200 space-y-0.5">
                          <p><span className="text-gray-500">Name:</span> {adminTarget.name}</p>
                          {adminTarget.bankName && <p><span className="text-gray-500">Bank:</span> {adminTarget.bankName}</p>}
                          <p><span className="text-gray-500">A/C:</span> <span className="font-mono">{adminTarget.accountNumber}</span></p>
                          <p><span className="text-gray-500">IFSC:</span> <span className="font-mono">{adminTarget.ifsc}</span></p>
                        </div>
                      )}
                      <input value={paymentReference} onChange={e => setPaymentReference(e.target.value)}
                        placeholder="Payment UTR / reference number" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-500/30 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                      <label className={`mt-3 flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-500/40 text-sm font-medium text-indigo-700 dark:text-indigo-300 ${uploadingPaymentScreenshot ? 'opacity-60' : 'cursor-pointer hover:bg-indigo-100/50 dark:hover:bg-indigo-500/10'}`}>
                        <FiUpload className="w-4 h-4" />
                        {uploadingPaymentScreenshot ? 'Uploading screenshot...' : paymentScreenshot ? 'Payment screenshot uploaded' : 'Upload payment screenshot *'}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingPaymentScreenshot}
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 8 * 1024 * 1024) { toast.error('Screenshot must be 8MB or smaller'); return; }
                            setUploadingPaymentScreenshot(true);
                            try {
                              const uploaded = await uploadAPI.single(file);
                              setPaymentScreenshot(uploaded.url);
                              toast.success('Payment screenshot uploaded');
                            } catch (error) { toast.error(error.message || 'Screenshot upload failed'); }
                            finally { setUploadingPaymentScreenshot(false); e.target.value = ''; }
                          }} />
                      </label>
                    </div>
                  ) : sellerCheckout && selectedPaymentMethod === 'seller_direct' ? (
                    <div className="border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl p-4 mb-6">
                      <p className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 mb-2">
                        <FaQrcode className="text-indigo-600 dark:text-indigo-400" /> Pay {firstSeller.shopName} directly
                      </p>
                      <p className="text-sm text-indigo-700 dark:text-indigo-400 mb-4">Scan the QR or pay using the UPI ID below. After payment, enter the UTR/reference number.</p>
                      {firstSeller.qrCodeImage && <img src={firstSeller.qrCodeImage} alt="Seller UPI QR" className="w-44 h-44 object-contain bg-white rounded-xl p-2 mx-auto mb-3" />}
                      {firstSeller.upiId && <p className="text-center font-mono font-bold text-indigo-900 dark:text-indigo-200 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 mb-3">{firstSeller.upiId}</p>}
                      <input value={paymentReference} onChange={e => setPaymentReference(e.target.value)}
                        placeholder="Payment UTR / reference number" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-500/30 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                      <label className={`mt-3 flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-500/40 text-sm font-medium text-indigo-700 dark:text-indigo-300 ${uploadingPaymentScreenshot ? 'opacity-60' : 'cursor-pointer hover:bg-indigo-100/50 dark:hover:bg-indigo-500/10'}`}>
                        <FiUpload className="w-4 h-4" />
                        {uploadingPaymentScreenshot ? 'Uploading screenshot...' : paymentScreenshot ? 'Payment screenshot uploaded' : 'Upload payment screenshot *'}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingPaymentScreenshot}
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 8 * 1024 * 1024) { toast.error('Screenshot must be 8MB or smaller'); return; }
                            setUploadingPaymentScreenshot(true);
                            try {
                              const uploaded = await uploadAPI.single(file);
                              setPaymentScreenshot(uploaded.url);
                              toast.success('Payment screenshot uploaded');
                            } catch (error) { toast.error(error.message || 'Screenshot upload failed'); }
                            finally { setUploadingPaymentScreenshot(false); e.target.value = ''; }
                          }} />
                      </label>
                      {!sellerPaymentReady && <p className="text-xs text-red-600 dark:text-red-400 mt-2">This seller has not completed KYC payment verification yet.</p>}
                    </div>
                  ) : selectedPaymentMethod === 'cod' ? (
                    <div className="border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 rounded-2xl p-4 mb-6">
                      <p className="font-semibold text-green-900 dark:text-green-300">Cash on Delivery</p>
                      <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                        {walletAmountUsed > 0
                          ? `${formatPrice(payableAmount)} pay the courier. ${formatPrice(walletAmountUsed)} wallet se adjust ho gaya hai.`
                          : 'Pay the courier when your order arrives.'}
                      </p>
                    </div>
                  ) : payableAmount > 0 && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center"><FiCheck className="w-3 h-3 text-white" /></div>
                        <p className="font-medium text-gray-800 dark:text-gray-100">Pay via Razorpay</p>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 ml-8">UPI, Cards, Net Banking, Wallets — all supported</p>
                      <div className="flex gap-2 ml-8 mt-2">
                        {['UPI', 'Visa', 'Mastercard', 'RuPay'].map(m => (
                          <span key={m} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg font-medium text-gray-600 dark:text-gray-300">{m}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mb-5">
                    {sellerCheckout && sellerPaymentReady && <button type="button" onClick={() => setSelectedPaymentMethod('seller_direct')} className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold ${selectedPaymentMethod === 'seller_direct' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>UPI / QR</button>}
                    {adminCheckout && <button type="button" onClick={() => setSelectedPaymentMethod('admin_direct')} className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold ${selectedPaymentMethod === 'admin_direct' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>UPI / QR / Bank</button>}
                    {codAvailable && <button type="button" onClick={() => { setSelectedPaymentMethod('cod'); setPaymentReference(''); }} className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold ${selectedPaymentMethod === 'cod' ? 'border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>Cash on Delivery</button>}
                    {!sellerCheckout && !adminCheckout && <button type="button" onClick={() => setSelectedPaymentMethod('razorpay')} className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold ${selectedPaymentMethod === 'razorpay' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>Online Payment</button>}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
                    <Button variant="primary" fullWidth size="lg" loading={placingOrder} onClick={handlePayment}>
                      {walletCoversOrder ? 'Place Order with Wallet' : selectedPaymentMethod === 'cod' ? `Place COD Order ${formatPrice(payableAmount)}` : (selectedPaymentMethod === 'seller_direct' || selectedPaymentMethod === 'admin_direct') ? `Submit Payment ${formatPrice(payableAmount)}` : `Pay ${formatPrice(payableAmount)}`} →
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="bg-white dark:bg-gray-800/60 rounded-3xl p-6 shadow-sm h-fit sticky" style={{ top: 'var(--navbar-height, 96px)' }}>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-5">Order Summary</h3>
            {groups.length > 1 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3 mb-4">For {activeGroup?.name} · cart total {formatPrice(cartTotal)}</p>
            )}
            <div className="space-y-3 text-sm mb-5">
              <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal ({items.length} items)</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Shipping</span><span className={shipping === 0 ? 'text-green-600 dark:text-green-400 font-medium' : ''}>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span></div>
              {tax > 0 && <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Tax</span><span>{formatPrice(tax)}</span></div>}
              {walletAmountUsed > 0 && <div className="flex justify-between text-blue-600 dark:text-blue-400"><span>Wallet Applied</span><span>-{formatPrice(walletAmountUsed)}</span></div>}
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 text-lg">
                <span>{walletAmountUsed > 0 ? 'Payable Now' : 'Total'}</span><span>{formatPrice(payableAmount)}</span>
              </div>
              {shipping === 0 && <p className="text-green-600 dark:text-green-400 text-xs mt-1">You get free delivery!</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}