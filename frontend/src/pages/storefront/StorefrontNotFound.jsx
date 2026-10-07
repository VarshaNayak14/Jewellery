import { FiShoppingBag } from 'react-icons/fi';
import { getMainSiteUrl } from '../../utils/subdomain';

// Shown when a store subdomain doesn't match any approved seller.
export default function StorefrontNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-white dark:bg-gray-950">
      <FiShoppingBag className="w-14 h-14 text-gray-300 dark:text-gray-700 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Store not found</h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">This store doesn't exist, or is no longer available.</p>
      <a href={getMainSiteUrl()} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
        Go to Jewellery
      </a>
    </div>
  );
}
