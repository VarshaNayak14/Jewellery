import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { getStoreSlugFromHost, getStoreSlugFromPath, getStorePath } from './utils/subdomain';
import StorefrontApp from './StorefrontApp';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import FloatingWhatsApp from './components/common/FloatingWhatsApp';
import ScrollToTop from './components/common/ScrollToTop';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminRoute from './components/common/AdminRoute';
import SuperAdminRoute from './components/common/SuperAdminRoute';
import SellerRoute from './components/common/SellerRoute';
import CourierRoute from './components/common/CourierRoute';

import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import OrderDetail from './pages/OrderDetail';
import CourierLogin from './pages/courier/CourierLogin';
import CourierDashboardHome from './pages/courier/CourierDashboardHome';
import CourierDeliveries from './pages/courier/CourierDeliveries';
import CourierReturns from './pages/courier/CourierReturns';
import CourierHistory from './pages/courier/CourierHistory';
import CourierEarnings from './pages/courier/CourierEarnings';
import CourierProfile from './pages/courier/CourierProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import Advertise from './pages/Advertise';
import BusinessDirectory from './pages/BusinessDirectory';
import BusinessProfile from './pages/BusinessProfile';
import SearchResults from './pages/SearchResults';
import Blogs from './pages/Blogs';
import BlogDetail from './pages/BlogDetail';

// User Account (My Account hub)
import MyAccount from './pages/user/MyAccount';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCategories from './pages/admin/AdminCategories';
import AdminSellers from './pages/admin/AdminSellers';
import AdminKyc from './pages/admin/AdminKyc';
import AdminOffers from './pages/admin/AdminOffers';
import AdminInventory from './pages/admin/AdminInventory';
import AdminSubscriptionPayments from './pages/admin/AdminSubscriptionPayments';
import AdminOrders from './pages/admin/AdminOrders';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminCouriers from './pages/admin/AdminCouriers';
import AdminReviews from './pages/admin/AdminReviews';
import AdminSettings from './pages/admin/AdminSettings';
import AdminProfile from './pages/admin/AdminProfile';
import AdminReturns from './pages/admin/AdminReturns';
import AdminReports from './pages/admin/AdminReports';
import AdminMetalRates from './pages/admin/AdminMetalRates';
import AdminBlogs from './pages/admin/AdminBlogs';

// Super Admin pages
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import SuperAdminAdmins from './pages/superadmin/SuperAdminAdmins';
import SuperAdminPlans from './pages/superadmin/SuperAdminPlans';
import SuperAdminContactMessages from './pages/superadmin/SuperAdminContactMessages';
import { SuperAdminPageWrapper } from './pages/superadmin/SuperAdminLayout';

// Additional Seller pages
import SellerAnalytics from './pages/seller/SellerAnalytics';
import SellerEarnings from './pages/seller/SellerEarnings';

// Seller pages
import SellerRegister from './pages/seller/SellerRegister';
import SellerLogin from './pages/seller/SellerLogin';
import SellerDashboard from './pages/seller/SellerDashboard';
import SellerProducts from './pages/seller/SellerProducts';
import SellerOrders from './pages/seller/SellerOrders';
import SellerCouriers from './pages/seller/SellerCouriers';
import SellerReturns from './pages/seller/SellerReturns';
import SellerShopSettings from './pages/seller/SellerShopSettings';
import SellerStoreCustomize from './pages/seller/SellerStoreCustomize';
import SellerKyc from './pages/seller/SellerKyc';
import SellerProfile from './pages/seller/SellerProfile';
import SellerInventory from './pages/seller/SellerInventory';
import SellerReviews from './pages/seller/SellerReviews';
import SellerOffers from './pages/seller/SellerOffers';
import SellerPlan from './pages/seller/SellerPlan';
import SellerSupport from './pages/seller/SellerSupport';
import AdminSupport from './pages/admin/AdminSupport';
import AdminCustomerTickets from './pages/admin/AdminCustomerTickets';
import AdminWhatsAppChats from './pages/admin/AdminWhatsAppChats';
import SellerCustomerTickets from './pages/seller/SellerCustomerTickets';
import LegalPage from './pages/LegalPage';
import FaqPage from './pages/FaqPage';
import Contact from './pages/Contact';

import { useAuthStore } from './store/authStore';
import { useSellerStore } from './store/sellerStore';
import { useWishlistStore } from './store/wishlistStore';
import { useCartStore } from './store/cartStore';
import CartDrawer from './components/cart/CartDrawer';
import ReviewPopup from './components/common/ReviewPopup';
import SignupPopup from './components/common/SignupPopup';
import Breadcrumbs from './components/layout/Breadcrumbs';
import { loadGoogleTranslateScript, startBannerWatcher } from './utils/googleTranslate';

export default function App() {
  const { pathname } = useLocation();
  const hostStoreSlug = getStoreSlugFromHost();
  const storeSlug = hostStoreSlug || getStoreSlugFromPath(pathname);
  const storeBasePath = hostStoreSlug ? '' : getStorePath(storeSlug);
  const { initAuth, isAuthenticated } = useAuthStore();
  const { initSeller } = useSellerStore();
  const { fetchWishlist } = useWishlistStore();
  const { fetchCart, resetToGuest } = useCartStore();

  useEffect(() => {
    initAuth();
    initSeller();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
      fetchCart(); // also merges any items added as a guest into the account cart
    } else {
      resetToGuest(); // logged out → back to the browser-only guest cart
    }
  }, [isAuthenticated]);

  // Runs on every route (including Login/Register/Admin/Seller/storefront,
  // none of which render the main Navbar where LanguageSwitcher normally
  // lives) so the translate banner never shows unsuppressed anywhere.
  useEffect(() => {
    loadGoogleTranslateScript();
    const observer = startBannerWatcher();
    return () => observer.disconnect();
  }, []);

  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/superadmin');
  const isSellerRoute = pathname.startsWith('/seller') && !['/seller/login', '/seller/register'].includes(pathname);
  const isCourierRoute = pathname.startsWith('/courier') && pathname !== '/courier/login';
  const isAuthRoute = ['/login', '/register', '/seller/login', '/seller/register', '/courier/login'].includes(pathname);

  const showLayout = !isAdminRoute && !isSellerRoute && !isCourierRoute && !isAuthRoute;
  const isCustomerAuthPage = ['/login', '/register'].includes(pathname);

  // A seller's own store, using either a legacy subdomain or a main-domain
  // path, gets its own storefront app entirely.
  if (storeSlug) return (
    <>
      <div id="google_translate_element" className="hidden" />
      <StorefrontApp slug={storeSlug} basePath={storeBasePath} />
    </>
  );

  return (
    <div className={showLayout || isCustomerAuthPage ? 'jewel-market-shell' : ''}>
      <div id="google_translate_element" className="hidden" />
      <ScrollToTop />
      {showLayout && <Navbar />}
      {showLayout && <Breadcrumbs />}
      {showLayout && <CartDrawer />}
      {showLayout && <ReviewPopup />}
      {showLayout && <SignupPopup />}
      <Routes>
        {/* ── Public Routes ── */}
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/:category" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/order-confirmation/:id" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
        <Route path="/order/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Navigate to="/my-account/orders" replace /></ProtectedRoute>} />
        <Route path="/courier" element={<CourierRoute><CourierDashboardHome /></CourierRoute>} />
        <Route path="/courier/deliveries" element={<CourierRoute><CourierDeliveries /></CourierRoute>} />
        <Route path="/courier/returns" element={<CourierRoute><CourierReturns /></CourierRoute>} />
        <Route path="/courier/history" element={<CourierRoute><CourierHistory /></CourierRoute>} />
        <Route path="/courier/earnings" element={<CourierRoute><CourierEarnings /></CourierRoute>} />
        <Route path="/courier/profile" element={<CourierRoute><CourierProfile /></CourierRoute>} />
        <Route path="/courier/login" element={<CourierLogin />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/wishlist" element={<Navigate to="/my-account/wishlist" replace />} />
        <Route path="/advertise" element={<Advertise />} />
        <Route path="/nearby" element={<BusinessDirectory />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/blogs" element={<Blogs />} />
        <Route path="/blogs/:slug" element={<BlogDetail />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy-policy" element={<LegalPage />} />
        <Route path="/terms-and-conditions" element={<LegalPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/business/:slug" element={<BusinessProfile />} />

        {/* ── My Account (User Hub) ── */}
        <Route path="/my-account" element={<ProtectedRoute><MyAccount /></ProtectedRoute>} />
        <Route path="/my-account/:section" element={<ProtectedRoute><MyAccount /></ProtectedRoute>} />

        {/* ── Admin Routes ── */}
        <Route path="/admin" element={<AdminRoute permission="dashboard"><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/profile" element={<AdminRoute><AdminProfile /></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute permission="products"><AdminProducts /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute permission="users"><AdminUsers /></AdminRoute>} />
        <Route path="/admin/categories" element={<AdminRoute permission="categories"><AdminCategories /></AdminRoute>} />
        <Route path="/admin/sellers" element={<AdminRoute permission="sellers"><AdminSellers /></AdminRoute>} />
        <Route path="/admin/support" element={<AdminRoute permission="support"><AdminSupport /></AdminRoute>} />
        <Route path="/admin/customer-tickets" element={<AdminRoute permission="support"><AdminCustomerTickets /></AdminRoute>} />
        <Route path="/admin/whatsapp" element={<AdminRoute permission="support"><AdminWhatsAppChats /></AdminRoute>} />
        <Route path="/admin/kyc" element={<AdminRoute permission="kyc"><AdminKyc /></AdminRoute>} />
        <Route path="/admin/inventory" element={<AdminRoute permission="inventory"><AdminInventory /></AdminRoute>} />
        <Route path="/admin/subscription-payments" element={<AdminRoute permission="subscriptions"><AdminSubscriptionPayments /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute permission="orders"><AdminOrders /></AdminRoute>} />
        <Route path="/admin/withdrawals" element={<AdminRoute permission="sellers"><AdminWithdrawals /></AdminRoute>} />
        <Route path="/admin/couriers" element={<AdminRoute permission="orders"><AdminCouriers /></AdminRoute>} />
        <Route path="/superadmin/returns" element={<SuperAdminRoute><AdminReturns Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/admin/reviews" element={<AdminRoute permission="reviews"><AdminReviews /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute permission="settings"><AdminSettings /></AdminRoute>} />
        <Route path="/admin/returns" element={<AdminRoute permission="returns"><AdminReturns /></AdminRoute>} />
        <Route path="/admin/reports" element={<AdminRoute permission="reports"><AdminReports /></AdminRoute>} />
        <Route path="/admin/offers" element={<AdminRoute permission="offers"><AdminOffers /></AdminRoute>} />
        <Route path="/admin/metal-rates" element={<AdminRoute permission="rates"><AdminMetalRates /></AdminRoute>} />
        <Route path="/admin/blogs" element={<AdminRoute permission="blogs"><AdminBlogs /></AdminRoute>} />

        {/* ── Super Admin Routes ── */}
        <Route path="/superadmin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
        <Route path="/superadmin/admins" element={<SuperAdminRoute><SuperAdminAdmins /></SuperAdminRoute>} />
        <Route path="/superadmin/plans" element={<SuperAdminRoute><SuperAdminPlans /></SuperAdminRoute>} />
        <Route path="/superadmin/contact-messages" element={<SuperAdminRoute><SuperAdminContactMessages /></SuperAdminRoute>} />
        <Route path="/superadmin/subscription-payments" element={<SuperAdminRoute><AdminSubscriptionPayments Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/orders" element={<SuperAdminRoute><AdminOrders Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/withdrawals" element={<SuperAdminRoute><AdminWithdrawals Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/couriers" element={<SuperAdminRoute><AdminCouriers Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/categories" element={<SuperAdminRoute><AdminCategories Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/sellers" element={<SuperAdminRoute><AdminSellers Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/support" element={<SuperAdminRoute><AdminSupport Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/customer-tickets" element={<SuperAdminRoute><AdminCustomerTickets Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/whatsapp" element={<SuperAdminRoute><AdminWhatsAppChats Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/kyc" element={<SuperAdminRoute><AdminKyc Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/inventory" element={<SuperAdminRoute><AdminInventory Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/settings" element={<SuperAdminRoute><AdminSettings Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/profile" element={<SuperAdminRoute><AdminProfile Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/payment-settings" element={<SuperAdminRoute><AdminSettings Wrapper={SuperAdminPageWrapper} initialTab="Payment" /></SuperAdminRoute>} />
        <Route path="/superadmin/products" element={<SuperAdminRoute><AdminProducts Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/users" element={<SuperAdminRoute><AdminUsers Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/reviews" element={<SuperAdminRoute><AdminReviews Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/reports" element={<SuperAdminRoute><AdminReports Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/offers" element={<SuperAdminRoute><AdminOffers Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/metal-rates" element={<SuperAdminRoute><AdminMetalRates Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />
        <Route path="/superadmin/blogs" element={<SuperAdminRoute><AdminBlogs Wrapper={SuperAdminPageWrapper} /></SuperAdminRoute>} />

        {/* ── Seller Routes ── */}
        <Route path="/seller/register" element={<SellerRegister />} />
        <Route path="/seller/login" element={<SellerLogin />} />
        <Route path="/seller/dashboard" element={<SellerRoute><SellerDashboard /></SellerRoute>} />
        <Route path="/seller/plan" element={<SellerRoute><SellerPlan /></SellerRoute>} />
        <Route path="/seller/support" element={<SellerRoute><SellerSupport /></SellerRoute>} />
        <Route path="/seller/customer-tickets" element={<SellerRoute><SellerCustomerTickets /></SellerRoute>} />
        <Route path="/seller/products" element={<SellerRoute><SellerProducts /></SellerRoute>} />
        <Route path="/seller/inventory" element={<SellerRoute><SellerInventory /></SellerRoute>} />
        <Route path="/seller/orders" element={<SellerRoute><SellerOrders /></SellerRoute>} />
        <Route path="/seller/couriers" element={<SellerRoute><SellerCouriers /></SellerRoute>} />
        <Route path="/seller/returns" element={<SellerRoute><SellerReturns /></SellerRoute>} />
        <Route path="/seller/reviews" element={<SellerRoute><SellerReviews /></SellerRoute>} />
        <Route path="/seller/offers" element={<SellerRoute><SellerOffers /></SellerRoute>} />
        <Route path="/seller/analytics" element={<SellerRoute><SellerAnalytics /></SellerRoute>} />
        <Route path="/seller/earnings" element={<SellerRoute><SellerEarnings /></SellerRoute>} />
        <Route path="/seller/customize" element={<SellerRoute><SellerStoreCustomize /></SellerRoute>} />
        <Route path="/seller/kyc" element={<SellerRoute><SellerKyc /></SellerRoute>} />
        <Route path="/seller/settings" element={<SellerRoute><SellerShopSettings /></SellerRoute>} />
        <Route path="/seller/profile" element={<SellerRoute><SellerProfile /></SellerRoute>} />

        {/* ── Catch-all ── */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showLayout && <Footer />}
      {showLayout && <FloatingWhatsApp />}
    </div>
  );
}