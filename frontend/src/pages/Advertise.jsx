import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiMonitor, FiTrendingUp, FiTarget, FiBarChart2, FiCheck, FiMail } from 'react-icons/fi';

const perks = [
  {
    icon: FiTarget,
    title: 'Homepage Banner Placement',
    desc: 'Get featured on the growthkarts homepage carousel and category landing pages seen by thousands of daily shoppers.',
  },
  {
    icon: FiTrendingUp,
    title: 'Boosted Search Ranking',
    desc: 'Promoted listings appear higher in search and category results, driving more clicks to your products.',
  },
  {
    icon: FiBarChart2,
    title: 'Campaign Analytics',
    desc: 'Track impressions, clicks and conversions for every campaign right from your Seller Dashboard.',
  },
];

const plans = [
  { name: 'Starter', price: '₹999', period: '/week', features: ['1 category banner', 'Basic analytics', 'Email support'] },
  { name: 'Growth', price: '₹2,999', period: '/week', features: ['Homepage + category banner', 'Search boost', 'Priority analytics', 'Chat support'], highlighted: true },
  { name: 'Pro', price: '₹6,999', period: '/week', features: ['All Growth features', 'Flash Sale placement', 'Dedicated account manager', '24x7 support'] },
];

export default function Advertise() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 pb-16">
      <div className="max-w-6xl mx-auto px-4">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <FiMonitor className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">Advertise on growthkarts</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
            Put your products in front of thousands of active shoppers with homepage banners,
            boosted search placement and flash-sale features.
          </p>
        </motion.div>

        {/* Perks */}
        <div className="grid sm:grid-cols-3 gap-5 mb-16">
          {perks.map((p, i) => (
            <motion.div key={p.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                <p.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1.5">{p.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Plans */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center mb-8">Choose an Advertising Plan</h2>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map(plan => (
              <div key={plan.name}
                className={`rounded-2xl p-6 border ${plan.highlighted ? 'border-blue-500 shadow-xl scale-[1.03] bg-white dark:bg-gray-800/60' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/60 shadow-sm'}`}>
                {plan.highlighted && (
                  <span className="inline-block text-xs font-bold text-white bg-blue-600 px-3 py-1 rounded-full mb-3">Most Popular</span>
                )}
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{plan.name}</h3>
                <p className="mt-1 mb-4">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{plan.price}</span>
                  <span className="text-sm text-gray-400 dark:text-gray-500">{plan.period}</span>
                </p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <FiCheck className="w-4 h-4 text-blue-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/seller/register"
                  className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    plan.highlighted ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20'
                  }`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="bg-blue-600 rounded-3xl px-8 py-10 text-center text-white">
          <h3 className="text-xl font-bold mb-2">Have a custom campaign in mind?</h3>
          <p className="text-blue-100 text-sm mb-5">Our team can build a bespoke advertising package for your brand.</p>
          <a href="mailto:ads@growthkarts.com"
            className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold px-6 py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-sm">
            <FiMail className="w-4 h-4" /> Contact our Ads Team
          </a>
        </div>
      </div>
    </div>
  );
}