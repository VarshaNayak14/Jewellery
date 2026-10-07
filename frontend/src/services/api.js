import axios from 'axios';
import { getMainSiteUrl } from '../utils/subdomain';

const API_BASE_URL = import.meta.env.VITE_API_URL
  || `${getMainSiteUrl()}/api/v1`;

const clearInvalidSession = (kind) => {
  const isSeller = kind === 'seller';
  const tokenKey = isSeller ? 'growthkarts_seller_token' : 'growthkarts_token';
  const userKey = isSeller ? 'growthkarts_seller_user' : 'growthkarts_user';
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  if (isSeller) localStorage.removeItem('growthkarts_seller');

  const path = window.location.pathname;
  const alreadyOnLogin = isSeller ? path === '/seller/login' : path === '/login';
  const belongsToSession = isSeller ? path.startsWith('/seller') : (path.startsWith('/admin') || path.startsWith('/superadmin'));
  if (belongsToSession && !alreadyOnLogin) window.location.assign(isSeller ? '/seller/login' : '/login');
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('growthkarts_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) clearInvalidSession('user');
    const message = err.response?.data?.message || err.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

// Seller API uses seller token
export const sellerApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
sellerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('growthkarts_seller_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
sellerApi.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/seller/login')) clearInvalidSession('seller');
    // Plan lapsed mid-session — send the seller to My Plan to renew.
    if (err.response?.data?.status === 'plan_expired' && window.location.pathname.startsWith('/seller')
      && window.location.pathname !== '/seller/plan') window.location.assign('/seller/plan');
    const message = err.response?.data?.message || err.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePassword: (data) => api.put('/auth/update-password', data),
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  addAddress: (data) => api.post('/users/address', data),
  updateAddress: (id, data) => api.put(`/users/address/${id}`, data),
  deleteAddress: (id) => api.delete(`/users/address/${id}`),
  // FIXED: added — used by AdminUsers.jsx, backend routes already existed in userRoutes.js
  getAll: (params) => api.get('/users', { params }),
  updateRole: (id, data) => api.put(`/users/${id}/role`, data),
  toggleStatus: (id) => api.put(`/users/${id}/toggle-status`),
};

export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getOne: (id) => api.get(`/products/${id}`),
  // Real, product-backed nav tree (category + its subcategories, only ones
  // that actually have live products) — used by Navbar mega menu & Shop page.
  getCategoryTree: () => api.get('/products/categories'),
  getFeatured: (params) => api.get('/products/featured', { params }),
  getFlashSale: (params) => api.get('/products/flash-sale', { params }),
  search: (q) => api.get('/products/search', { params: { q } }),
  // Admin product management — every product, no location/approval filter
  // (the public getAll above is location-scoped for the customer storefront).
  getAllAdmin: (params) => api.get('/products/admin/all', { params }),
  // Admin product management
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  // Variant management (admin)
  addVariant: (productId, data) => api.post(`/products/${productId}/variants`, data),
  updateVariant: (productId, variantId, data) => api.put(`/products/${productId}/variants/${variantId}`, data),
  deleteVariant: (productId, variantId) => api.delete(`/products/${productId}/variants/${variantId}`),
};

export const cartAPI = {
  get: () => api.get('/cart'),
  add: (data) => api.post('/cart/add', data),
  update: (itemId, data) => api.put(`/cart/item/${itemId}`, data),
  remove: (itemId) => api.delete(`/cart/item/${itemId}`),
  clear: () => api.delete('/cart/clear'),
};

// ── Business Directory (JustDial-style listing + search) ──────────────────
export const businessAPI = {
  search: (params) => api.get('/businesses', { params }),
  getProfile: (slug) => api.get(`/businesses/${slug}`),
  getCities: () => api.get('/businesses/cities'),
  getStates: () => api.get('/businesses/states'),
  getDistricts: (state) => api.get('/businesses/districts', { params: state ? { state } : {} }),
  getTehsils: (district) => api.get('/businesses/tehsils', { params: district ? { district } : {} }),
  getCategoryCounts: () => api.get('/businesses/category-counts'),
};

// ── Unified JustDial-style search (shops + categories + products) ─────────
export const searchAPI = {
  // Navbar dropdown, as-you-type. params: { q, state, district, tehsil }
  suggest: (params) => api.get('/search/suggest', { params }),
  // Full results page.
  // params: { q, tab, category, subCategory, city, sort, page, limit,
  //           state, district, tehsil }
  search: (params) => api.get('/search', { params }),
  // Categories + top categories by shop count (empty-state chips)
  popular: () => api.get('/search/popular'),
};

export const enquiryAPI = {
  send: (data) => api.post('/enquiries', data),
  getMine: (params) => sellerApi.get('/enquiries/mine', { params }),
  updateStatus: (id, status) => sellerApi.put(`/enquiries/${id}/status`, { status }),
  getAllAdmin: (params) => api.get('/enquiries/admin/all', { params }),
};

export const contactMessageAPI = {
  send: (data) => api.post('/contact-messages', data),
  getAll: (params) => api.get('/contact-messages/superadmin/all', { params }),
};

export const walletAPI = {
  get: () => api.get('/wallet'),
  getTransactions: (params) => api.get('/wallet/transactions', { params }),
};

// Customer support tickets (customer side)
export const customerTicketAPI = {
  getMy: () => api.get('/customer-tickets/my'),
  create: (data) => api.post('/customer-tickets', data),
  get: (id) => api.get(`/customer-tickets/${id}`),
  reply: (id, message, images = []) => api.post(`/customer-tickets/${id}/reply`, { message, images }),
  escalate: (id, reason) => api.post(`/customer-tickets/${id}/escalate`, { reason }),
  close: (id) => api.put(`/customer-tickets/${id}/close`),
};

export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getMyOrders: (params) => api.get('/orders/my-orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  getOne: (id) => api.get(`/orders/${id}`),
  cancel: (id) => api.put(`/orders/${id}/cancel`),
  getAll: (params) => api.get('/orders', { params }),
  getAllAdmin: (params) => api.get('/orders', { params }),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  // Who receives the online payment for these (admin-owned) products?
  getAdminPaymentTarget: (productIds) => api.post('/orders/admin-payment-target', { productIds }),
  getAdminPaymentGroups: (productIds) => api.post('/orders/admin-payment-groups', { productIds }),
  // Owner admin verifies / rejects a customer's direct payment: { action: 'verify'|'reject', note }
  reviewAdminPayment: (id, data) => api.put(`/orders/${id}/admin-payment`, data),
};

export const paymentAPI = {
  createOrder: (data) => api.post('/payments/create-order', data),
  verify: (data) => api.post('/payments/verify', data),
  createRazorpayOrder: (data) => api.post('/payments/create-order', data),
  verifyRazorpay: (data) => api.post('/payments/verify', data),
  getKey: () => api.get('/payments/key'),
};

export const wishlistAPI = {
  get: () => api.get('/wishlist'),
  // Backend only exposes a toggle endpoint (add-if-absent / remove-if-present)
  // — there's no separate add/remove route, so both reuse it. Safe because
  // callers only invoke "add" on items not yet in the wishlist and "remove"
  // on items already in it.
  add: (productId) => api.post('/wishlist/toggle', { productId }),
  remove: (productId) => api.post('/wishlist/toggle', { productId }),
  toggle: (productId) => api.post('/wishlist/toggle', { productId }),
  clear: () => api.delete('/wishlist/clear'),
};

export const reviewAPI = {
  getFeatured: (params) => api.get('/reviews/featured', { params }),
  getByProduct: (productId, params) => api.get(`/reviews/product/${productId}`, { params }),
  getMyReviews: () => api.get('/reviews/my-reviews'),
  canReview: (productId) => api.get(`/reviews/can-review/${productId}`),
  getPending: () => api.get('/reviews/pending'),
  create: (data) => api.post('/reviews', data),
  toggleHelpful: (id) => api.post(`/reviews/${id}/helpful`),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
  adminGetAll: (params) => api.get('/reviews', { params }),
  adminDelete: (id) => api.delete(`/reviews/${id}`), // FIXED: was /reviews/admin/${id}, backend route is /reviews/:id
  // FIXED: added — used by AdminReviews.jsx
  adminToggleVisibility: (id) => api.put(`/reviews/${id}/toggle-visibility`),
  // Pin / unpin on the homepage "Loved by you" testimonials
  adminToggleFeatured: (id) => api.put(`/reviews/${id}/toggle-featured`),
};

export const categoryAPI = {
  getAll: () => api.get('/categories'),
  getAllAdmin: (params) => api.get('/categories/all', { params }),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  getSubcategories: (slug) => api.get(`/categories/${slug}/subcategories`),
  addType: (catId, type) => api.post(`/categories/${catId}/types`, { type }),
  removeType: (catId, type) => api.delete(`/categories/${catId}/types/${type}`),
  renameType: (catId, oldType, newType) => api.put(`/categories/${catId}/types/rename`, { oldType, newType }),
};

export const returnAPI = {
  create: (data) => api.post('/returns', data),
  getMy: () => api.get('/returns/my-returns'),
  getMyReturns: () => api.get('/returns/my-returns'),
  adminGetAll: (params) => api.get('/returns', { params }),
  adminUpdate: (id, data) => api.put(`/returns/${id}`, data),
  adminAssignCourier: (id, data) => api.put(`/returns/${id}/assign-courier`, data),
  // FIXED: added — used by AdminReturns.jsx
  adminGetStats: () => api.get('/returns/stats'),
  sellerGetAll: () => sellerApi.get('/returns/seller/returns'),
  sellerUpdate: (id, data) => sellerApi.put(`/returns/seller/${id}`, data),
  sellerAssignCourier: (id, data) => sellerApi.put(`/returns/seller/${id}/assign-courier`, data),
};

export const trackingAPI = {
  getOrderTracking: (id) => api.get(`/orders/${id}/tracking`),
};

export const courierAPI = {
  adminGetAll: () => api.get('/courier'),
  adminGetApproved: () => api.get('/courier/approved'),
  adminCreate: (data) => api.post('/courier', data),
  adminUpdateStatus: (id, status, perDeliveryFee) => api.put(`/courier/${id}/status`, { status, perDeliveryFee }),
  adminUpdate: (id, data) => api.put(`/courier/${id}`, data),
  adminToggleBlock: (id) => api.put(`/courier/${id}/block`),
  adminDelete: (id) => api.delete(`/courier/${id}`),
  adminAssignToOrder: (id, data) => api.put(`/courier/orders/${id}/assign`, data),
  getMe: () => api.get('/courier/me'),
  updateMe: (data) => api.put('/courier/me', data),
  getMyOrders: () => api.get('/courier/my-orders'),
  updateOrderStatus: (id, data) => api.put(`/courier/orders/${id}/status`, data),
  submitSellerPayment: (id, data) => api.put(`/courier/seller-payments/${id}`, data),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getMyReturns: () => api.get('/returns/courier/mine'),
  updateReturnStatus: (id, data) => api.put(`/returns/courier/${id}/status`, data),
};


export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  getPublic: () => api.get('/settings/public'),
  // Footer legal pages (Privacy Policy, Terms & Conditions)
  getLegalPage: (slug) => api.get(`/settings/pages/${slug}`),
  updateLegalPage: (slug, data) => api.put(`/settings/pages/${slug}`, data),
  // Super Admin's bank/UPI/QR details — shown to a prospective seller on the
  // "Become a Seller" payment step, right after they pick a plan.
  getPaymentDetails: () => api.get('/settings/payment-details'),
};

const getNotificationClient = () => {
  const sellerToken = localStorage.getItem('growthkarts_seller_token');
  return sellerToken ? sellerApi : api;
};

export const notificationAPI = {
  getMy: () => getNotificationClient().get('/notifications/my'),
  markRead: (id) => getNotificationClient().put(`/notifications/${id}/read`),
  markAllRead: () => getNotificationClient().put('/notifications/read-all'),
  clearAll: () => getNotificationClient().delete('/notifications/clear-all'),
  adminGetAll: () => api.get('/notifications/all'),
  adminSend: (data) => api.post('/notifications', data),
  adminCreate: (data) => api.post('/notifications', data),
};

// ── Image upload (Cloudinary) — used by product forms so Admin/Seller can
// pick a file from their device instead of pasting a URL.
export const uploadAPI = {
  single: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  // Batched so any number of images can be picked at once without tripping
  // the backend's multer array cap ("Unexpected field"); all URLs are merged.
  multiple: async (files) => {
    const arr = Array.from(files);
    const CHUNK = 8;
    const urls = [];
    for (let i = 0; i < arr.length; i += CHUNK) {
      const formData = new FormData();
      arr.slice(i, i + CHUNK).forEach((file) => formData.append('images', file));
      const res = await api.post('/upload/multiple', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      urls.push(...(res.urls || []));
    }
    return { urls };
  },
  // Single image or video (up to 200MB) — resolves { url, type }
  media: (file) => {
    const formData = new FormData();
    formData.append('media', file);
    return api.post('/upload/media', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  // Customer review photos + videos — resolves { images: [...], videos: [...] }
  reviewMedia: (files) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('media', file));
    return api.post('/upload/review-media', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  // Return issue media for user-submitted return requests.
  returnMedia: (files) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('media', file));
    return api.post('/upload/review-media', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const locationAPI = {
  checkPincode: (pincode) => api.get(`/location/check/${pincode}`), // FIXED: backend is mounted at /location (singular), not /locations
};

export const adminAPI = {
  getPaymentDetails: () => api.get('/admin/payment-details'),
  savePaymentDetails: (data) => api.put('/admin/payment-details', data),
  getDashboardStats: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  createCustomer: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  getSellers: (params) => api.get('/admin/sellers', { params }),
  getAllSellers: (params) => api.get('/admin/sellers', { params }),
  createSeller: (data) => api.post('/admin/sellers', data),
  assignSellerPlan: (sellerId, data) => api.put(`/admin/sellers/${sellerId}/plan`, data),
  getSellerAnalytics: () => api.get('/admin/sellers/analytics'),
  updateSellerStatus: (id, data) => api.put(`/admin/sellers/${id}/status`, data),
  getWithdrawals: (params) => api.get('/admin/withdrawals', { params }),
  getAllWithdrawals: (params) => api.get('/admin/withdrawals', { params }),
  updateWithdrawal: (id, data) => api.put(`/admin/withdrawals/${id}/status`, data),
  processWithdrawal: (id, data) => api.put(`/admin/withdrawals/${id}/status`, data),
  getReports: (params) => api.get('/admin/reports', { params }),
  // FIXED: added — used by AdminReports.jsx, AdminSellers.jsx
  getSalesReport: (params) => api.get('/admin/reports/sales', { params }),
  getKycRequests: (params) => api.get('/admin/kyc', { params }),
  getProductKycRequirement: () => api.get('/admin/kyc/product-requirement'),
  updateProductKycRequirement: (data) => api.put('/admin/kyc/product-requirement', data),
  updateSellerKyc: (id, data) => api.put(`/admin/sellers/${id}/kyc`, data),
  getInventory: (params) => api.get('/admin/inventory', { params }),
  updateProductStock: (id, data) => api.put(`/admin/inventory/${id}/stock`, data),
  getSubscriptionPayments: (params) => api.get('/admin/subscription-payments', { params }),
  verifyOfferPlanPayment: (id) => api.put(`/admin/subscription-payments/${id}/verify-offer-plan`),
  verifySellerPlanPayment: (id) => api.put(`/admin/subscription-payments/${id}/verify-seller-plan`),
  rejectPlanPayment: (id) => api.put(`/admin/subscription-payments/${id}/reject`),
  // Seller support tickets + personal business managers
  getSupportTickets: (params) => api.get('/admin/support', { params }),
  getSupportTicket: (id) => api.get(`/admin/support/${id}`),
  replySupportTicket: (id, message, images = []) => api.post(`/admin/support/${id}/reply`, { message, images }),
  // Customer tickets (escalated from sellers / platform products)
  getCustomerTickets: (params) => api.get('/admin/customer-tickets', { params }),
  getCustomerTicket: (id) => api.get(`/admin/customer-tickets/${id}`),
  replyCustomerTicket: (id, message, images = []) => api.post(`/admin/customer-tickets/${id}/reply`, { message, images }),
  updateCustomerTicket: (id, data) => api.put(`/admin/customer-tickets/${id}`, data),
  // WhatsApp enquiries inbox
  getWhatsAppChats: (params) => api.get('/admin/whatsapp/chats', { params }),
  getWhatsAppChat: (id) => api.get(`/admin/whatsapp/chats/${id}`),
  createWhatsAppChat: (data) => api.post('/admin/whatsapp/chats', data),
  replyWhatsAppChat: (id, message) => api.post(`/admin/whatsapp/chats/${id}/reply`, { message }),
  updateWhatsAppChat: (id, data) => api.put(`/admin/whatsapp/chats/${id}`, data),
  updateSupportTicket: (id, data) => api.put(`/admin/support/${id}`, data),
  getSupportStaff: () => api.get('/admin/support/staff'),
  assignSellerManager: (sellerId, managerId) => api.put(`/admin/sellers/${sellerId}/manager`, { managerId }),
  // Homepage offer banners — Admin/SuperAdmin approval queue
  getPendingOffers: () => api.get('/offers/pending'),
  getAllOffers: (params) => api.get('/offers', { params }),
  getOfferProducts: (params) => api.get('/offers/products', { params }),
  reviewOffer: (id, data) => api.put(`/offers/${id}/review`, data),
  assignOfferPlan: (sellerId, planId) => api.put(`/offers/sellers/${sellerId}/offer-plan`, { planId }),
  // Homepage banner (offer) plans — read-only for Admins (Super Admin edits them)
  getOfferPlans: () => api.get('/offers/plans'),
  // Homepage banners added by Admin / Super Admin (live straight away)
  createPlatformOffer: (data) => api.post('/offers/admin', data),
  updatePlatformOffer: (id, data) => api.put(`/offers/admin/${id}`, data),
  deletePlatformOffer: (id, placement) => api.delete(`/offers/admin/${id}`, { params: { placement } }),
};

// Public — homepage offer banners approved for the main site, and a given
// seller's own offers (used on their storefront, regardless of status)
export const offerAPI = {
  getApproved: (params) => api.get('/offers/approved', { params }),
  getBySeller: (sellerId) => api.get(`/offers/seller/${sellerId}`),
};

// Seller portal API
export const sellerAPI = {
  register: (data) => sellerApi.post('/seller/register', data),
  login: (data) => sellerApi.post('/seller/login', data),
  // Plan-fee payment via Razorpay — public (no seller token yet)
  createPlanPayment: (data) => api.post('/seller/plan-payment/create-order', data),
  verifyPlanPayment: (data) => api.post('/seller/plan-payment/verify', data),
  getSellerPlans: () => sellerApi.get('/seller/plans'),
  submitSellerPlanBankPayment: (data) => sellerApi.post('/seller/plan-renewal/bank', data),
  // Help & Support tickets
  getSupport: () => sellerApi.get('/seller/support'),
  createSupportTicket: (data) => sellerApi.post('/seller/support', data),
  getSupportTicket: (id) => sellerApi.get(`/seller/support/${id}`),
  replySupportTicket: (id, message, images = []) => sellerApi.post(`/seller/support/${id}/reply`, { message, images }),
  // Customer tickets about this seller's orders / products
  getCustomerTickets: (params) => sellerApi.get('/seller/customer-tickets', { params }),
  getCustomerTicket: (id) => sellerApi.get(`/seller/customer-tickets/${id}`),
  replyCustomerTicket: (id, message, images = [], resolve = false) => sellerApi.post(`/seller/customer-tickets/${id}/reply`, { message, images, resolve }),
  closeSupportTicket: (id) => sellerApi.put(`/seller/support/${id}/close`),
  createSellerPlanPayment: (data) => sellerApi.post('/seller/plan-renewal/create-order', data),
  activateSellerPlan: (data) => sellerApi.post('/seller/plan-renewal/activate', data),
  createOfferPlanPayment: (data) => sellerApi.post('/seller/offer-plan-payment/create-order', data),
  activateOfferPlan: (data) => sellerApi.post('/seller/offer-plan-payment/activate', data),
  submitOfferPlanBankPayment: (data) => sellerApi.post('/seller/offer-plan-payment/bank', data),
  getOfferPlans: () => sellerApi.get('/seller/offer-plans'),
  // Manual bank/QR transfer — screenshot upload (public, no seller token yet)
  uploadPaymentProof: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/seller/plan-payment/proof', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getMe: () => sellerApi.get('/seller/me'),
  updateShop: (data) => sellerApi.put('/seller/shop', data),
  getDashboardStats: () => sellerApi.get('/seller/dashboard'),
  getAnalytics: (params) => sellerApi.get('/seller/analytics', { params }),
  getProducts: (params) => sellerApi.get('/seller/products', { params }),
  createProduct: (data) => sellerApi.post('/seller/products', data),
  updateProduct: (id, data) => sellerApi.put(`/seller/products/${id}`, data),
  deleteProduct: (id) => sellerApi.delete(`/seller/products/${id}`),
  // Seller product variant management (same as admin)
  addVariant: (productId, data) => sellerApi.post(`/seller/products/${productId}/variants`, data),
  updateVariant: (productId, variantId, data) => sellerApi.put(`/seller/products/${productId}/variants/${variantId}`, data),
  deleteVariant: (productId, variantId) => sellerApi.delete(`/seller/products/${productId}/variants/${variantId}`),
  getOrders: (params) => sellerApi.get('/seller/orders', { params }),
  updateOrderStatus: (id, data) => sellerApi.put(`/seller/orders/${id}/status`, data),
  getEarnings: () => sellerApi.get('/seller/earnings'),
  requestWithdrawal: (data) => sellerApi.post('/seller/withdrawals', data),
  getWithdrawals: () => sellerApi.get('/seller/withdrawals'),
  getCourierPayments: () => sellerApi.get('/seller/courier-payments'),
  reviewCourierPayment: (id, data) => sellerApi.put(`/seller/courier-payments/${id}/review`, data),
  getReferrals: () => sellerApi.get('/seller/referrals'),
  // Homepage offer banners — pending until Admin/SuperAdmin approves them
  // for the main site; always visible on the seller's own storefront.
  getMyOffers: () => sellerApi.get('/offers/mine'),
  createOffer: (data) => sellerApi.post('/offers', data),
  updateOffer: (id, data) => sellerApi.put(`/offers/${id}`, data),
  deleteOffer: (id, placement) => sellerApi.delete(`/offers/${id}`, { params: { placement } }),
  getPublicShop: (slug) => sellerApi.get(`/seller/shop/${slug}`),
  submitKyc: (data) => sellerApi.put('/seller/kyc', data),
  getReviews: () => sellerApi.get('/reviews/seller/reviews'),
  replyToReview: (id, data) => sellerApi.put(`/reviews/${id}/reply`, data),
  getReturns: () => sellerApi.get('/returns/seller/returns'),
  updateReturn: (id, data) => sellerApi.put(`/returns/seller/${id}`, data),
  assignCourierToReturn: (id, data) => sellerApi.put(`/returns/seller/${id}/assign-courier`, data),
  // Seller's own delivery partners — separate pool from the platform's
  // admin-managed couriers, only usable on this seller's own orders.
  createCourier: (data) => sellerApi.post('/courier/seller', data),
  getCouriers: () => sellerApi.get('/courier/seller/mine'),
  updateCourier: (id, data) => sellerApi.put(`/courier/seller/${id}`, data),
  toggleCourierBlock: (id) => sellerApi.put(`/courier/seller/${id}/block`),
  deleteCourier: (id) => sellerApi.delete(`/courier/seller/${id}`),
  assignCourierToOrder: (id, data) => sellerApi.put(`/courier/seller/orders/${id}/assign`, data),
  getNotifications: () => sellerApi.get('/notifications/my'),
  // Image upload (Cloudinary) — for the seller's own product form
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return sellerApi.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  // Uploaded in batches so a seller can pick *any* number of gallery photos
  // at once. The backend's multer array cap ("Unexpected field" past the
  // limit) only ever sees one batch, and all the resulting URLs are merged.
  uploadImages: async (files) => {
    const arr = Array.from(files);
    const CHUNK = 8;
    const urls = [];
    for (let i = 0; i < arr.length; i += CHUNK) {
      const formData = new FormData();
      arr.slice(i, i + CHUNK).forEach((file) => formData.append('images', file));
      const res = await sellerApi.post('/upload/multiple', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      urls.push(...(res.urls || []));
    }
    return { urls };
  },
  uploadMedia: (file) => {
    const formData = new FormData();
    formData.append('media', file);
    return sellerApi.post('/upload/media', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export default api;

// Public — subscription plans shown on "Become a Seller" (dynamic, Super Admin managed)
export const planAPI = {
  getAll: () => api.get('/plans'),
  getOfferPlans: () => api.get('/plans/offers'),
};

// Super Admin portal API (uses same admin token/login, role check happens on backend)
export const superAdminAPI = {
  getDashboardStats: () => api.get('/superadmin/dashboard'),
  getAllAdmins: () => api.get('/superadmin/admins'),
  createAdmin: (data) => api.post('/superadmin/admins', data),
  updateAdminPermissions: (id, data) => api.put(`/superadmin/admins/${id}/permissions`, data),
  toggleAdminStatus: (id) => api.put(`/superadmin/admins/${id}/toggle-status`),
  deleteAdmin: (id) => api.delete(`/superadmin/admins/${id}`),
  // Subscription plans
  getAllPlans: (params) => api.get('/superadmin/plans', { params }),
  createPlan: (data) => api.post('/superadmin/plans', data),
  updatePlan: (id, data) => api.put(`/superadmin/plans/${id}`, data),
  togglePlanStatus: (id) => api.put(`/superadmin/plans/${id}/toggle-status`),
  deletePlan: (id) => api.delete(`/superadmin/plans/${id}`),
  assignSellerPlan: (sellerId, data) => api.put(`/superadmin/sellers/${sellerId}/plan`, data),
};
// Gold / silver / platinum rates per gram. Public to read; Admin / Super Admin
// ("rates" permission) to edit — saving re-prices every live-priced product.
export const metalRateAPI = {
  getAll: () => api.get('/metal-rates'),
  update: (rates) => api.put('/metal-rates', { rates }),
  remove: (id) => api.delete(`/metal-rates/${id}`),
  recalculate: () => api.post('/metal-rates/recalculate'),
};

// Journal / blog posts. Public list + article by slug; Admin / Super Admin
// ("blogs" permission) manage them from the panel.
export const blogAPI = {
  getAll: (params) => api.get('/blogs', { params }),
  getBySlug: (slug) => api.get(`/blogs/${slug}`),
  adminGetAll: (params) => api.get('/blogs/admin/all', { params }),
  adminGet: (id) => api.get(`/blogs/admin/${id}`),
  create: (data) => api.post('/blogs', data),
  update: (id, data) => api.put(`/blogs/${id}`, data),
  remove: (id) => api.delete(`/blogs/${id}`),
};
