import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiSearch, FiArrowLeft } from 'react-icons/fi';

// Catch-all for any URL that doesn't match a real route on the main site.
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-[#05070f] relative overflow-hidden">
      {/* ambient glow orbs, matching the Home page's dark-hero accent style */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[10%] -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center max-w-lg"
      >
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-[7rem] sm:text-[9rem] font-extrabold leading-none bg-gradient-to-r from-blue-600 via-sky-500 to-amber-500 dark:from-blue-400 dark:via-sky-300 dark:to-amber-300 bg-clip-text text-transparent"
        >
          404
        </motion.p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2 mb-2">
          This page wandered off the shelf
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist, moved, or the link is broken. Let's get you back to shopping.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/25">
            <FiHome className="w-4 h-4" /> Back to Home
          </Link>
          <Link to="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <FiSearch className="w-4 h-4" /> Browse Shop
          </Link>
        </div>

        <button onClick={() => window.history.back()}
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          <FiArrowLeft className="w-3.5 h-3.5" /> Go back
        </button>
      </motion.div>
    </div>
  );
}
