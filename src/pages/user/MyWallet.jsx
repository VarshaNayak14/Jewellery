import { useEffect } from 'react';
import { FiArrowDownLeft, FiArrowUpRight, FiCreditCard } from 'react-icons/fi';
import { useWalletStore } from '../../store/walletStore';
import { formatPrice } from '../../utils/helpers';

export default function MyWallet() {
  const { wallet, transactions, isLoading, fetchWallet, fetchTransactions } = useWalletStore();

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <FiCreditCard className="w-5 h-5" />
          </div>
          <p className="text-blue-200 text-sm font-medium">Wallet Balance</p>
        </div>
        <p className="text-4xl font-bold">{formatPrice(wallet?.balance || 0)}</p>
        <p className="text-blue-300 text-xs mt-2">Used automatically at checkout, or from returns &amp; cancellations refunded here.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-blue-100 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-blue-100 dark:border-gray-800">
          <h3 className="font-semibold text-blue-900 dark:text-gray-100">Transaction History</h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-blue-400 dark:text-gray-500 text-sm">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-blue-400 dark:text-gray-500 text-sm">No transactions yet.</div>
        ) : (
          <div className="divide-y divide-blue-50 dark:divide-gray-800">
            {transactions.map((t) => (
              <div key={t._id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === 'credit' ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                    {t.type === 'credit' ? <FiArrowDownLeft className="w-4 h-4" /> : <FiArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-blue-900 dark:text-gray-100 truncate">{t.reason}</p>
                    <p className="text-xs text-blue-400 dark:text-gray-500">
                      {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {t.order?.orderNumber && ` • Order #${t.order.orderNumber}`}
                    </p>
                  </div>
                </div>
                <p className={`text-sm font-bold flex-shrink-0 ${t.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {t.type === 'credit' ? '+' : '-'}{formatPrice(t.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
