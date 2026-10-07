import { useState, useEffect } from 'react';
import { FiBox, FiAlertTriangle, FiEdit2, FiSave, FiSearch, FiPackage, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import { useDebounce } from '../../hooks/useDebounce';

const STOCK_TABS = [
  { key: '', label: 'All' },
  { key: 'out', label: 'Out of Stock' },
  { key: 'low', label: 'Low Stock' },
  { key: 'in', label: 'In Stock' },
];

export default function AdminInventory({ Wrapper = AdminPageWrapper }) {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({});
  const [stockFilter, setStockFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [stockValue, setStockValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const LIMIT = 20;

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getInventory({
        stockStatus: stockFilter || undefined,
        search: debouncedSearch || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        page,
        limit: LIMIT,
      });
      setProducts(data.products || []);
      setStats(data.stats || {});
      setPages(data.pages || 1);
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInventory(); }, [stockFilter, debouncedSearch, dateFrom, dateTo, page]);
  // Any filter/search change should snap back to page 1 — staying on page 4
  // of a filter that now has 1 page of results would just show an empty table.
  useEffect(() => { setPage(1); }, [stockFilter, debouncedSearch, dateFrom, dateTo]);

  const handleUpdateStock = async (productId) => {
    if (stockValue === '' || isNaN(stockValue) || Number(stockValue) < 0) return toast.error('Enter a valid stock number');
    setSaving(true);
    try {
      await adminAPI.updateProductStock(productId, { stock: Number(stockValue) });
      toast.success('Stock updated!');
      setEditing(null);
      fetchInventory();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Wrapper title="Inventory Management" subtitle="Stock levels across every seller, platform-wide">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalProducts || 0}</p>
          <p className="text-xs font-medium mt-1 text-gray-500 dark:text-gray-400">Total Products</p>
        </div>
        <div className="rounded-2xl p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalUnits || 0}</p>
          <p className="text-xs font-medium mt-1 text-gray-500 dark:text-gray-400">Total Units in Stock</p>
        </div>
        <div className="rounded-2xl p-4 bg-yellow-50 dark:bg-yellow-500/10">
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.lowStock || 0}</p>
          <p className="text-xs font-medium mt-1 text-yellow-700 dark:text-yellow-400">Low Stock (≤5)</p>
        </div>
        <div className="rounded-2xl p-4 bg-red-50 dark:bg-red-500/10">
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.outOfStock || 0}</p>
          <p className="text-xs font-medium mt-1 text-red-700 dark:text-red-400">Out of Stock</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {STOCK_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setStockFilter(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                stockFilter === tab.key ? 'bg-gray-900 dark:bg-gray-700 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">From</label>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} max={dateTo || undefined}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 [color-scheme:light] dark:[color-scheme:dark]" />
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">To</label>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom || undefined}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 [color-scheme:light] dark:[color-scheme:dark]" />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Clear</button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading inventory...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <FiBox className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No products match this filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  {['Product', 'Seller', 'SKU', 'Category', 'Stock', 'Status', 'Action'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0">
                          {product.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{product.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {product.sellerId ? (
                        <span className="flex items-center gap-1.5"><FiPackage className="w-3.5 h-3.5 text-indigo-400" /> {product.sellerId.shopName}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Platform</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">{product.sku || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 capitalize whitespace-nowrap">{product.category}</td>
                    <td className="px-4 py-3">
                      {editing === product._id ? (
                        <div className="flex items-center gap-2">
                          <input type="number" value={stockValue} onChange={(e) => setStockValue(e.target.value)} min="0"
                            className="w-20 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1 text-sm" autoFocus />
                          <button onClick={() => handleUpdateStock(product._id)} disabled={saving}
                            className="p-1 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-500/20">
                            <FiSave className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-sm font-semibold ${product.stock === 0 ? 'text-red-600 dark:text-red-400' : product.stock <= 5 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                          {product.stock}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                        product.stock === 0 ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400' :
                        product.stock <= 5 ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                        'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                      }`}>
                        {product.stock === 0 ? 'Out of Stock' : product.stock <= 5 ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {editing !== product._id && (
                        <button onClick={() => { setEditing(product._id); setStockValue(String(product.stock)); }}
                          className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 whitespace-nowrap">
                          <FiEdit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && products.length > 0 && pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {pages}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
              <FiChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
              Next <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Wrapper>
  );
}
