import { FaWhatsapp, FaFacebook, FaTelegram } from 'react-icons/fa';
import { FiCopy, FiShare2, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getStoreUrl } from '../../utils/subdomain';

// "Share your store" — the seller's dedicated landing page link with one-tap
// sharing to WhatsApp / Facebook / Telegram, so they can promote it on
// social media (core idea of the platform).
export default function ShareStoreCard({ seller }) {
  if (!seller?.shopSlug) return null;
  const url = getStoreUrl(seller.shopSlug);
  const text = `Visit ${seller.shopName} online — see all our products and order directly:`;
  const enc = encodeURIComponent;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success('Store link copied'); }
    catch { toast.error('Could not copy'); }
  };
  const nativeShare = async () => {
    try { await navigator.share({ title: seller.shopName, text, url }); } catch { /* cancelled */ }
  };

  const btn = 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors';
  return (
    <div className="rounded-2xl border border-blue-100 dark:border-blue-500/20 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 p-4 sm:p-5 mb-6 sm:mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><FiShare2 className="w-4 h-4 text-blue-600" /> Share your store</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Post your own store link on WhatsApp, Facebook & Instagram — customers order from you directly.</p>
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2">
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{url}</span>
            <button onClick={copy} title="Copy link" className="text-gray-400 hover:text-blue-600 shrink-0"><FiCopy className="w-4 h-4" /></button>
            <a href={url} target="_blank" rel="noreferrer" title="Open store" className="text-gray-400 hover:text-blue-600 shrink-0"><FiExternalLink className="w-4 h-4" /></a>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`https://wa.me/?text=${enc(`${text} ${url}`)}`} target="_blank" rel="noreferrer" className={`${btn} bg-green-500 hover:bg-green-600 text-white`}><FaWhatsapp className="w-4 h-4" /> WhatsApp</a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noreferrer" className={`${btn} bg-[#1877f2] hover:opacity-90 text-white`}><FaFacebook className="w-4 h-4" /> Facebook</a>
          <a href={`https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`} target="_blank" rel="noreferrer" className={`${btn} bg-sky-500 hover:bg-sky-600 text-white`}><FaTelegram className="w-4 h-4" /> Telegram</a>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button onClick={nativeShare} className={`${btn} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200`}><FiShare2 className="w-4 h-4" /> More (Instagram…)</button>
          )}
        </div>
      </div>
    </div>
  );
}
