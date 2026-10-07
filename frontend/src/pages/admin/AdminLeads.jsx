import { useState, useEffect } from 'react';
import { FiPhoneCall, FiAlertCircle, FiClock, FiCheck, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { enquiryAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import Pagination from '../../components/common/Pagination';
import { usePagedList } from '../../hooks/usePagedList';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'closed', label: 'Closed' },
  { key: 'spam', label: 'Spam' },
];

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400', icon: FiAlertCircle },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', icon: FiClock },
  closed: { label: 'Closed', color: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400', icon: FiCheck },
  spam: { label: 'Spam', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300', icon: FiX },
};

const SOURCE_LABEL = { contact_form: 'Enquiry Form', click_to_call: 'Call', whatsapp: 'WhatsApp' };

export default function AdminLeads({ Wrapper = AdminPageWrapper }) {
  const [leads, setLeads] = useState([]);
  // Table shows 20 rows per page.
  const tablePage = usePagedList(leads);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    enquiryAPI.getAllAdmin({ status: statusFilter || undefined, limit: 50 })
      .then((data) => setLeads(data.data || []))
      .catch(() => toast.error('Failed to load leads'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <Wrapper title="Leads" subtitle="Every enquiry/call/WhatsApp lead across the platform">
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
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
        ) : leads.length === 0 ? (
          <div className="p-10 text-center text-gray-400 dark:text-gray-500">
            <FiPhoneCall className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-sm">No leads yet.</p>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  {['Business', 'Customer', 'Contact', 'Source', 'Date', 'Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {tablePage.pageItems.map((lead) => {
                  const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={lead._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{lead.business?.shopName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{lead.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{lead.phone}{lead.email ? ` · ${lead.email}` : ''}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap"><span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{SOURCE_LABEL[lead.source] || lead.source}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" /> {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={tablePage.page} limit={tablePage.limit} total={tablePage.total} onPageChange={tablePage.setPage} />
          </>
        )}
      </div>
    </Wrapper>
  );
}
