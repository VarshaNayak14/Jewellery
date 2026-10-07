import { useState, useEffect } from 'react';
import { FiPhoneCall, FiMessageCircle, FiMail, FiClock, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { enquiryAPI } from '../../services/api';
import { toWhatsappNumber } from '../../utils/helpers';
import SellerLayout from './SellerLayout';

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
  spam: { label: 'Spam', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400', icon: FiX },
};

const SOURCE_LABEL = { contact_form: 'Enquiry Form', click_to_call: 'Call', whatsapp: 'WhatsApp' };

export default function SellerLeads() {
  const [leads, setLeads] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await enquiryAPI.getMine({ status: statusFilter || undefined });
      setLeads(data.data || []);
    } catch { toast.error('Failed to load leads'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLeads(); }, [statusFilter]);

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    try {
      await enquiryAPI.updateStatus(id, status);
      setLeads((prev) => prev.map((l) => (l._id === id ? { ...l, status } : l)));
    } catch (err) { toast.error(err.message || 'Failed to update'); }
    finally { setUpdatingId(null); }
  };

  const counts = leads.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {});

  return (
    <SellerLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Leads</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Customers who called, WhatsApped, or enquired about your business</p>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === tab.key ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">Loading...</div>
        ) : leads.length === 0 ? (
          <div className="p-10 text-center text-gray-400 dark:text-gray-500">
            <FiPhoneCall className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-sm">No leads yet. They'll show up here when customers call, WhatsApp, or enquire.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {leads.map((lead) => {
              const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
              const StatusIcon = cfg.icon;
              return (
                <div key={lead._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{lead.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" /> {cfg.label}
                      </span>
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{SOURCE_LABEL[lead.source] || lead.source}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{lead.phone}{lead.email ? ` · ${lead.email}` : ''}</p>
                    {lead.message && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">{lead.message}</p>}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                      {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={`tel:${lead.phone}`} className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Call back">
                      <FiPhoneCall className="w-4 h-4" />
                    </a>
                    <a href={`https://wa.me/${toWhatsappNumber(lead.phone)}`} target="_blank" rel="noreferrer"
                      className="p-2.5 rounded-xl bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors" title="WhatsApp">
                      <FiMessageCircle className="w-4 h-4" />
                    </a>
                    <select value={lead.status} disabled={updatingId === lead._id}
                      onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                      className="text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                      {STATUS_TABS.filter((t) => t.key).map((t) => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
