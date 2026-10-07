import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiExternalLink, FiClock } from 'react-icons/fi';
import { adminAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import ToggleSwitch from '../../components/common/ToggleSwitch';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'not_submitted', label: 'Not Submitted' },
];

const STATUS_CONFIG = {
  not_submitted: { label: 'Not Submitted', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' },
  pending: { label: 'Pending', color: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  approved: { label: 'Approved', color: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' },
  rejected: { label: 'Rejected', color: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400' },
};

export default function AdminKyc({ Wrapper = AdminPageWrapper }) {
  const [sellers, setSellers] = useState([]);
  const [counts, setCounts] = useState({});
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [requireProductKyc, setRequireProductKyc] = useState(true);
  const [loadingRequirement, setLoadingRequirement] = useState(true);
  const [savingRequirement, setSavingRequirement] = useState(false);

  const fetchKyc = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getKycRequests({ status: statusFilter || undefined });
      setSellers(data.sellers || []);
      setCounts(data.counts || {});
    } catch { toast.error('Failed to load KYC requests'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchKyc(); }, [statusFilter]);

  useEffect(() => {
    adminAPI.getProductKycRequirement()
      .then(data => setRequireProductKyc(data.required))
      .catch(err => toast.error(err.message || 'Failed to load product KYC setting'))
      .finally(() => setLoadingRequirement(false));
  }, []);

  const updateProductKycRequirement = async (required) => {
    setSavingRequirement(true);
    try {
      const data = await adminAPI.updateProductKycRequirement({ required });
      setRequireProductKyc(data.required);
      toast.success(data.required ? 'KYC is required before product listing' : 'KYC is no longer required before product listing');
    } catch (err) {
      toast.error(err.message || 'Failed to update product KYC setting');
    } finally {
      setSavingRequirement(false);
    }
  };

  const handleApprove = async (sellerId) => {
    setUpdatingId(sellerId);
    try {
      await adminAPI.updateSellerKyc(sellerId, { status: 'approved' });
      toast.success('KYC approved!');
      fetchKyc();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setUpdatingId(null); }
  };

  const handleReject = async (sellerId) => {
    setUpdatingId(sellerId);
    try {
      await adminAPI.updateSellerKyc(sellerId, { status: 'rejected', rejectionReason });
      toast.success('KYC rejected');
      setRejectingId(null);
      setRejectionReason('');
      fetchKyc();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setUpdatingId(null); }
  };

  return (
    <Wrapper title="KYC Management" subtitle="Review seller identity verification submissions">
      <div className="mb-6 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-white dark:bg-gray-900 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">Product listing KYC requirement</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Turn this off to let sellers add products without approved KYC. KYC remains required for withdrawals.
            </p>
          </div>
          {loadingRequirement ? (
            <span className="text-sm text-gray-400">Loading...</span>
          ) : (
            <div className={savingRequirement ? 'pointer-events-none opacity-60' : ''}>
              <ToggleSwitch checked={requireProductKyc} onChange={updateProductKycRequirement} label={requireProductKyc ? 'Required' : 'Not required'} />
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { key: 'pending', label: 'Pending Review', color: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
          { key: 'approved', label: 'Approved', color: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' },
          { key: 'rejected', label: 'Rejected', color: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' },
          { key: 'not_submitted', label: 'Not Submitted', color: 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300' },
        ].map((c) => (
          <div key={c.key} className={`rounded-2xl p-4 ${c.color}`}>
            <p className="text-2xl font-bold">{counts[c.key] || 0}</p>
            <p className="text-xs font-medium mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === tab.key ? 'bg-gray-900 dark:bg-gray-700 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">Loading...</div>
        ) : sellers.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">No sellers in this category.</div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {sellers.map((seller) => {
              const status = seller.kyc?.status || 'not_submitted';
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={seller._id} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {seller.logo ? (
                        <img src={seller.logo} alt={seller.shopName} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold flex-shrink-0">
                          {seller.shopName?.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{seller.shopName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{seller.user?.name} · {seller.user?.email}</p>
                        {seller.kyc?.panNumber && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">PAN: {seller.kyc.panNumber}</p>}
                        {seller.kyc?.addressProofType && <p className="text-xs text-gray-500 dark:text-gray-400">Address proof: {seller.kyc.addressProofType}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                      {seller.kyc?.panDocument && (
                        <a href={seller.kyc.panDocument} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">
                          PAN <FiExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {seller.kyc?.idDocument && (
                        <a href={seller.kyc.idDocument} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">
                          ID <FiExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {seller.kyc?.addressProofDocument && (
                        <a href={seller.kyc.addressProofDocument} target="_blank" rel="noreferrer" title={seller.kyc.addressProofType || 'Address proof'}
                          className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">
                          Address <FiExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {seller.kyc?.selfie && (
                        <a href={seller.kyc.selfie} target="_blank" rel="noreferrer" title="Selfie" className="shrink-0">
                          <img src={seller.kyc.selfie} alt="Selfie" className="w-9 h-9 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                        </a>
                      )}
                    </div>

                    {status === 'pending' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => handleApprove(seller._id)} disabled={updatingId === seller._id}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60">
                          <FiCheck className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => setRejectingId(rejectingId === seller._id ? null : seller._id)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20">
                          <FiX className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {rejectingId === seller._id && (
                    <div className="flex gap-2 mt-3 ml-14">
                      <input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Reason for rejection..." autoFocus
                        className="flex-1 min-w-0 px-3 py-2 border border-red-200 dark:border-red-500/30 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg text-xs" />
                      <button onClick={() => handleReject(seller._id)} disabled={updatingId === seller._id}
                        className="px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60 flex-shrink-0">
                        Confirm Reject
                      </button>
                    </div>
                  )}

                  {status === 'rejected' && seller.kyc?.rejectionReason && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-2 ml-14 flex items-center gap-1.5">
                      <FiClock className="w-3 h-3" /> Reason: {seller.kyc.rejectionReason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
