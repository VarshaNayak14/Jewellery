import StorefrontNavbar from './StorefrontNavbar';
import StorefrontFooter from './StorefrontFooter';
import CartDrawer from '../../components/cart/CartDrawer';

// Full header/footer shell for a seller's own storefront (the "<shop-slug>.domain"
// subdomain) — a mega-menu navbar and a full footer, separate from the main
// marketplace's Navbar/Footer, so each store feels like its own complete site.
export default function StorefrontLayout({ seller, categories, search, onSearch, onCategorySelect, basePath, children }) {
  const accent = seller?.themeColor || '#4f46e5';

  return (
    // `--accent` is set here (and only here) to the seller's chosen theme
    // color, so everything inside the storefront — including shared
    // components like ProductCard/buttons that use `var(--accent, <blue>)`
    // — picks up this store's color, while the main marketplace (where the
    // variable is never set) keeps its default blue via the fallback.
    <div style={{ '--accent': accent }} className="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <StorefrontNavbar
        seller={seller}
        categories={categories}
        accent={accent}
        search={search}
        onSearch={onSearch}
        onCategorySelect={onCategorySelect}
        basePath={basePath}
      />

      <main className="flex-1">{children}</main>

        <StorefrontFooter seller={seller} categories={categories} accent={accent} onCategorySelect={onCategorySelect} basePath={basePath} />

      <CartDrawer />
    </div>
  );
}