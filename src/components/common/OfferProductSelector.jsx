import { useMemo, useState } from 'react';
import { FiPackage } from 'react-icons/fi';

export default function OfferProductSelector({
  products = [],
  selectedIds = [],
  discountPercent = 0,
  loading = false,
  onToggle,
  onSearch,
  search = '',
  scopeLabel = 'products',
}) {
  const [query, setQuery] = useState(search);
  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? products.filter((product) => product.name?.toLowerCase().includes(normalized))
      : products;
  }, [products, query]);

  const updateSearch = (value) => {
    setQuery(value);
    onSearch?.(value);
  };

  return (
    <section>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Apply offer to products</label>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Choose products and set a discount percentage to update their sale price.
          </p>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {selectedIds.length} selected
        </span>
      </div>
      <input
        type="search"
        value={query}
        onChange={(event) => updateSearch(event.target.value)}
        placeholder={`Search ${scopeLabel}...`}
        className="w-full px-3 py-2 mb-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
      />
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl max-h-52 overflow-y-auto bg-gray-50 dark:bg-gray-800/50 divide-y divide-gray-100 dark:divide-gray-800">
        {loading ? (
          <p className="p-4 text-center text-xs text-gray-400">Loading products...</p>
        ) : visibleProducts.length === 0 ? (
          <p className="p-4 text-center text-xs text-gray-400">
            {products.length ? 'No products match your search.' : 'No products found.'}
          </p>
        ) : visibleProducts.map((product) => {
          const checked = selectedIds.includes(product._id);
          const image = product.images?.[0] || product.variants?.[0]?.images?.[0];
          const salePrice = Math.round(Number(product.price || 0) * (1 - Number(discountPercent || 0) / 100));
          return (
            <label key={product._id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(product._id)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
              />
              <span className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
                {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <FiPackage className="text-gray-400" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-gray-800 dark:text-gray-100 truncate">{product.name}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {checked && Number(discountPercent) > 0
                    ? <>₹{salePrice.toLocaleString('en-IN')} <del className="ml-1">₹{Number(product.price || 0).toLocaleString('en-IN')}</del></>
                    : `₹${Number(product.price || 0).toLocaleString('en-IN')}`}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
