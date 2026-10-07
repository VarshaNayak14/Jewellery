import ClassicTheme from './themes/ClassicTheme';
import MinimalTheme from './themes/MinimalTheme';
import VibrantTheme from './themes/VibrantTheme';
import RoyalTheme from './themes/RoyalTheme';
import BoutiqueTheme from './themes/BoutiqueTheme';
import ShowcaseTheme from './themes/ShowcaseTheme';
import OffersSection from '../../components/home/OffersSection';

const THEMES = {
  classic: ClassicTheme,
  minimal: MinimalTheme,
  vibrant: VibrantTheme,
  royal: RoyalTheme,
  boutique: BoutiqueTheme,
  showcase: ShowcaseTheme,
};

// Renders the seller's chosen storefront theme. Falls back to Classic if an
// unrecognized/blank theme value ever reaches here.
export default function StorefrontHome({
  seller, products, allProducts = products, activeCategory, activeSub, activeSearch, onCategorySelect, onClearFilter,
}) {
  const Theme = THEMES[seller.theme] || ClassicTheme;
  return (
    <Theme
      seller={seller}
      products={products}
      allProducts={allProducts}
      accent={seller.themeColor || '#4f46e5'}
      activeCategory={activeCategory}
      activeSub={activeSub}
      activeSearch={activeSearch}
      onCategorySelect={onCategorySelect}
      onClearFilter={onClearFilter}
      offersSlot={<OffersSection sellerId={seller._id} />}
    />
  );
}
