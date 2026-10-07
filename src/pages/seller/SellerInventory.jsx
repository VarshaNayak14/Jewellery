import { useState, useEffect } from 'react';
import { FiBox, FiAlertTriangle, FiEdit2, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { sellerAPI } from '../../services/api';
import SellerLayout from './SellerLayout';
import Pagination from '../../components/common/Pagination';
import { usePagedList } from '../../hooks/usePagedList';

export default function SellerInventory() {
  const [products, setProducts] = useState([]);
  // Table shows 20 rows per page.
  const tablePage = usePagedList(products);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [stockValue, setStockValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    sellerAPI.getProducts().then(d => setProducts(d.products || [])).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  const handleUpdateStock = async (productId) => {
    if (stockValue === '' || isNaN(stockValue)) return toast.error('Enter valid stock');
    setSaving(true);
    try {
      await sellerAPI.updateProduct(productId, { stock: Number(stockValue) });
      setProducts(p => p.map(x => x._id === productId ? {...x, stock: Number(stockValue)} : x));
      setEditing(null);
      toast.success('Stock updated!');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const lowStock = products.filter(p => p.stock <= 5);
  const outOfStock = products.filter(p => p.stock === 0);

  return (
    <SellerLayout>
      <div className="p-0 sm:p-2 lg:p-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Inventory Management</h1>

      {/* Alerts */}
      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {outOfStock.length > 0 && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <FiAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-400 text-sm">Out of Stock</p>
                <p className="text-red-700 dark:text-red-400 text-xs">{outOfStock.length} product(s) need restocking</p>
              </div>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
              <FiAlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-400 text-sm">Low Stock Alert</p>
                <p className="text-yellow-700 dark:text-yellow-400 text-xs">{lowStock.length} product(s) with ≤5 units</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading inventory...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <FiBox className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No products in inventory</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                {['Product', 'SKU', 'Category', 'Price', 'Stock', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {tablePage.pageItems.map(product => (
                <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0">
                        {product.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{product.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{product.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-400">{product.sku || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{product.category}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">₹{product.price}</td>
                  <td className="px-4 py-3">
                    {editing === product._id ? (
                      <div className="flex items-center gap-2">
                        <input type="number" value={stockValue} onChange={e => setStockValue(e.target.value)} min="0"
                          className="w-20 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2 py-1 text-sm" autoFocus />
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
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
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
                        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                        <FiEdit2 className="w-3.5 h-3.5" /> Edit Stock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={tablePage.page} limit={tablePage.limit} total={tablePage.total} onPageChange={tablePage.setPage} />
      </div>
    </SellerLayout>
  );
}
