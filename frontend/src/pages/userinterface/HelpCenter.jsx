import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiChevronDown, FiChevronUp, FiHelpCircle, FiSearch,
  FiTruck, FiCreditCard, FiRefreshCw, FiXCircle, FiStar, FiMessageCircle
} from 'react-icons/fi';

const FAQS = [
  {
    category: 'Order Tracking',
    icon: FiTruck,
    color: 'bg-violet-50 text-violet-600',
    items: [
      { q: 'How do I track my order?', a: 'Go to My Account → Order Tracking and enter your order ID. You\'ll see real-time tracking updates including location and estimated delivery date.' },
      { q: 'How long does delivery take?', a: 'Standard delivery takes 5–7 business days. Express delivery is available for select pin codes in 2–3 days.' },
      { q: 'What if my order is late?', a: 'If your order hasn\'t arrived by the estimated date, go to Order Tracking to check status. If it shows "In Transit" for more than 3 days, contact support.' },
    ],
  },
  {
    category: 'Payment Issues',
    icon: FiCreditCard,
    color: 'bg-blue-50 text-blue-600',
    items: [
      { q: 'My payment failed. What should I do?', a: 'Please check your bank balance and card details. Try again or use a different payment method. If the amount was deducted, it will be refunded within 5–7 business days.' },
      { q: 'Which payment methods are accepted?', a: 'We accept UPI, Razorpay, PhonePe, Paytm, Debit/Credit Cards, and Cash on Delivery (COD).' },
      { q: 'Is my payment information safe?', a: 'Yes, all payments are processed through PCI-DSS compliant payment gateways. We never store your card or UPI details.' },
    ],
  },
  {
    category: 'Returns & Refunds',
    icon: FiRefreshCw,
    color: 'bg-orange-50 text-orange-600',
    items: [
      { q: 'How do I return a product?', a: 'Go to My Account → Returns & Refunds, select the delivered order, choose the product and return reason, and submit your request.' },
      { q: 'How long does a refund take?', a: 'After return approval, refunds are processed within 5–10 business days. Wallet refunds are instant after approval.' },
      { q: 'What is the return policy?', a: 'Products can be returned within 7 days of delivery for wrong, damaged, or quality issues. Items must be unused and in original packaging.' },
    ],
  },
  {
    category: 'Cancellation Policy',
    icon: FiXCircle,
    color: 'bg-blue-50 text-blue-600',
    items: [
      { q: 'Can I cancel my order?', a: 'Orders can be cancelled before they are packed. Once packed or shipped, cancellation is not possible.' },
      { q: 'Will I get a full refund on cancellation?', a: 'Yes, if the order was paid online, the full amount will be refunded to the original payment method within 5–7 business days.' },
    ],
  },
  {
    category: 'Reviews & Ratings',
    icon: FiStar,
    color: 'bg-amber-50 text-amber-600',
    items: [
      { q: 'How do I review a product?', a: 'After a product is delivered, go to the product page or My Reviews and click "Write a Review". Only verified buyers can leave reviews.' },
      { q: 'Can I edit my review?', a: 'Yes, you can edit your review within 30 days of submitting it. Go to My Account → My Reviews to edit.' },
    ],
  },
  {
    category: 'Seller Support',
    icon: FiMessageCircle,
    color: 'bg-emerald-50 text-emerald-600',
    items: [
      { q: 'How do I contact a seller?', a: 'In the purchased products section, you\'ll find a "Contact Seller" option for each delivered item.' },
    ],
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl overflow-hidden border transition-all ${open ? 'border-rose-200' : 'border-gray-100'}`}>
      <button onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between p-4 text-left transition-colors ${open ? 'bg-rose-50' : 'bg-white hover:bg-gray-50'}`}>
        <span className={`text-sm font-semibold pr-4 leading-snug transition-colors ${open ? 'text-rose-700' : 'text-gray-900'}`}>{q}</span>
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all ${open ? 'bg-rose-500' : 'bg-gray-100'}`}>
          {open
            ? <FiChevronUp className="w-3.5 h-3.5 text-white" />
            : <FiChevronDown className="w-3.5 h-3.5 text-gray-500" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-1 text-sm text-gray-600 bg-rose-50/50 leading-relaxed border-t border-rose-100">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HelpCenter() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = FAQS.map(section => ({
    ...section,
    items: section.items.filter(item =>
      !search ||
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(section =>
    (activeCategory === 'all' || section.category === activeCategory) &&
    section.items.length > 0
  );

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">Help Center</h2>
        <p className="text-sm text-gray-500 mt-0.5">Find answers to your questions</p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search your question..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent shadow-sm transition-all" />
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        <button onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
            activeCategory === 'all' ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 'bg-white border border-gray-200 text-gray-600'
          }`}>
          All Topics
        </button>
        {FAQS.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.category} onClick={() => setActiveCategory(s.category)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                activeCategory === s.category
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-500'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {s.category}
            </button>
          );
        })}
      </div>

      {/* FAQ Sections */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
          <FiHelpCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-600 mb-1">No results found</p>
          <p className="text-sm text-gray-400">Try a different search term</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(section => {
            const Icon = section.icon;
            return (
              <div key={section.category} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${section.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">{section.category}</h3>
                  <span className="ml-auto text-xs text-gray-400">{section.items.length} articles</span>
                </div>
                <div className="p-4 space-y-2.5">
                  {section.items.map((item, i) => <FAQItem key={i} {...item} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contact Support Banner */}
      <div className="bg-gradient-to-r from-rose-500 to-blue-500 rounded-3xl p-6 mt-5 text-white text-center shadow-lg shadow-rose-200">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <FiMessageCircle className="w-6 h-6 text-white" />
        </div>
        <p className="font-bold text-lg mb-1">Still need help?</p>
        <p className="text-white/75 text-sm mb-4">Our support team is available Mon–Sat, 9am–6pm</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <a href="mailto:support@luxefit.in"
            className="bg-white text-rose-600 font-semibold text-sm px-5 py-2.5 rounded-2xl hover:bg-rose-50 transition-colors">
            Email Support
          </a>
          <a href="tel:+911800000000"
            className="bg-white/20 border border-white/30 text-white font-semibold text-sm px-5 py-2.5 rounded-2xl hover:bg-white/30 transition-colors">
            Call Us
          </a>
        </div>
      </div>
    </div>
  );
}