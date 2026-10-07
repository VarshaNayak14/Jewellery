import { useState } from 'react';
import { FiChevronDown, FiChevronUp, FiHelpCircle } from 'react-icons/fi';

const FAQS = [
  {
    category: 'Order Tracking',
    items: [
      { q: 'How do I track my order?', a: 'Go to My Account → Order Tracking and enter your order ID. You\'ll see real-time tracking updates including location and estimated delivery date.' },
      { q: 'How long does delivery take?', a: 'Standard delivery takes 5-7 business days. Express delivery is available for select pin codes in 2-3 days.' },
    ]
  },
  {
    category: 'Payment Issues',
    items: [
      { q: 'My payment failed. What should I do?', a: 'Please check your bank balance and card details. Try again or use a different payment method. If amount was deducted, it will be refunded within 5-7 business days.' },
      { q: 'Which payment methods are accepted?', a: 'We accept UPI, Razorpay, PhonePe, Paytm, Debit/Credit Cards, and Cash on Delivery (COD).' },
    ]
  },
  {
    category: 'Returns & Refunds',
    items: [
      { q: 'How do I return a product?', a: 'Go to My Account → Returns & Refunds, select the delivered order, choose the product and return reason, and submit your request.' },
      { q: 'How long does refund take?', a: 'After return approval, refunds are processed within 5-10 business days. Wallet refunds are instant after approval.' },
      { q: 'What is the return policy?', a: 'Products can be returned within 7 days of delivery for wrong, damaged, or quality issues. Products must be unused and in original packaging.' },
    ]
  },
  {
    category: 'Cancellation Policy',
    items: [
      { q: 'Can I cancel my order?', a: 'Orders can be cancelled before they are packed. Once packed or shipped, cancellation is not possible.' },
    ]
  },
  {
    category: 'Seller Support',
    items: [
      { q: 'How do I contact a seller?', a: 'In the purchased products section, you\'ll find a "Contact Seller" option for each delivered item.' },
    ]
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 pr-4">{q}</span>
        {open ? <FiChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" /> : <FiChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60">{a}</div>}
    </div>
  );
}

export default function HelpCenter() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Help Center</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Find answers to frequently asked questions below</p>
      <div className="space-y-6">
        {FAQS.map(section => (
          <div key={section.category} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex items-center gap-2">
              <FiHelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{section.category}</h3>
            </div>
            <div className="p-4 space-y-3">
              {section.items.map((item, i) => <FAQItem key={i} {...item} />)}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-6 mt-6 text-center">
        <p className="text-blue-900 dark:text-blue-300 font-semibold mb-1">Still need help?</p>
        <p className="text-blue-700 dark:text-blue-400 text-sm mb-3">Contact our support team for personalized assistance</p>
        <a href="mailto:support@luxefit.in" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
          Email Support
        </a>
      </div>
    </div>
  );
}
