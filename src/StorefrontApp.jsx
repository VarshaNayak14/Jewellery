import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import StorefrontLayout from './pages/storefront/StorefrontLayout';
import StorefrontHome from './pages/storefront/StorefrontHome';
import StorefrontShop from './pages/storefront/StorefrontShop';
import StorefrontNotFound from './pages/storefront/StorefrontNotFound';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import OrderDetail from './pages/OrderDetail';
import Login from './pages/Login';
import Wishlist from './pages/Wishlist';
import LegalPage from './pages/LegalPage';
import MyAccount from './pages/user/MyAccount';
import ProtectedRoute from './components/common/ProtectedRoute';
import { sellerAPI } from './services/api';
import FloatingWhatsApp from './components/common/FloatingWhatsApp';

// Root app rendered for a seller's own storefront subdomain (e.g.
// "my-shop.growthkarts.com" / "my-shop.localhost:5173" in dev — see
// App.jsx's getStoreSlugFromHost check). Fetches that one seller's public
// shop + product catalog, then runs its own small nested router — the main
// app's <Routes> in App.jsx is skipped entirely for a store subdomain, so
// this has to handle "/" and "/product/:id" itself.
function StorefrontApp({ slug, basePath = '' }) {
  const storePath = basePath || '/';
  const routePath = (suffix) => storePath === '/' ? `/${suffix}` : `${storePath}/${suffix}`;
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const shopPath = routePath('shop');
  const search = location.pathname === shopPath
    ? new URLSearchParams(location.search).get('search') || ''
    : '';

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setLoadError('');
    sellerAPI.getPublicShop(slug)
      .then((data) => { setSeller(data.seller); setProducts(data.products || []); })
      .catch((error) => {
        if (error.message?.toLowerCase().includes('too many requests')) {
          setLoadError('The store is temporarily rate-limited. Please refresh in a moment.');
        } else {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Category tree built from this seller's own live products (category ->
  // distinct subCategories), matching the {name, subCategories} shape
  // StorefrontNavbar/StorefrontFooter expect — no separate endpoint needed.
  const categories = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      if (!p.category) return;
      if (!map.has(p.category)) map.set(p.category, new Set());
      if (p.subCategory) map.get(p.category).add(p.subCategory);
    });
    return Array.from(map.entries()).map(([name, subs]) => ({ name, subCategories: Array.from(subs) }));
  }, [products]);

  // Navbar/footer category links and search all open the storefront's
  // "All Products" page (like the main site's /shop), with the filter
  // carried in the URL query so it survives reloads and back/forward.
  const goToShop = (query = {}) => {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v)).toString();
    navigate(qs ? `${shopPath}?${qs}` : shopPath);
  };
  const handleCategorySelect = (name = '', sub = '') => goToShop({ category: name, sub });
  const handleSearch = (q) => goToShop({ search: q?.trim() });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading store...</div>;
  }
  if (notFound || !seller) {
    if (loadError) return <div className="min-h-screen flex items-center justify-center text-center px-6 text-gray-500">{loadError}</div>;
    return <StorefrontNotFound />;
  }

  return (
    <StorefrontLayout
      seller={seller}
      categories={categories}
      search={search}
      onSearch={handleSearch}
        onCategorySelect={handleCategorySelect}
      basePath={storePath}
    >
      <Routes>
        <Route
          path={storePath}
          element={
            <StorefrontHome
              seller={seller}
              products={products}
              allProducts={products}
              onCategorySelect={(name) => handleCategorySelect(name)}
              onClearFilter={() => handleCategorySelect()}
            />
          }
        />
        <Route
          path={shopPath}
          element={<StorefrontShop products={products} categories={categories} accent={seller.themeColor || '#4f46e5'} />}
        />
        <Route path={routePath('product/:id')} element={<ProductDetail storefrontSeller={seller} />} />
        <Route path={routePath('privacy-policy')} element={<LegalPage seller={seller} basePath={storePath} />} />
        <Route path={routePath('terms-and-conditions')} element={<LegalPage seller={seller} basePath={storePath} />} />
        <Route path={routePath('checkout')} element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path={routePath('order-confirmation/:id')} element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
        <Route path={routePath('order/:id')} element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
        <Route path={routePath('orders')} element={<ProtectedRoute><Navigate to={routePath('my-account/orders')} replace /></ProtectedRoute>} />
        <Route path={routePath('login')} element={<Login />} />
        <Route path={routePath('wishlist')} element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
        <Route path={routePath('my-account')} element={<ProtectedRoute><MyAccount basePath={storePath} /></ProtectedRoute>} />
        <Route path={routePath('my-account/:section')} element={<ProtectedRoute><MyAccount basePath={storePath} /></ProtectedRoute>} />
        <Route path="*" element={<StorefrontNotFound />} />
      </Routes>
      {/* Platform support chat — number set by Admin / Super Admin in Settings */}
      <FloatingWhatsApp />
    </StorefrontLayout>
  );
}

export default StorefrontApp;
