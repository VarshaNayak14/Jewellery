import { useState, useEffect } from 'react';
import { FiMessageSquare, FiEye, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { complaintAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import Pagination from '../../components/common/Pagination';
import { usePagedList } from '../../hooks/usePagedList';

const statusColors = {
  open: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  in_progress: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  resolved: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400',
  closed: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
};

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  // Table shows 20 rows per page.
  const tablePage = usePagedList(complaints);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ status: '', adminResponse: '' });
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try { const d = await complaintAPI.adminGetAll(); setComplaints(d.complaints || []); }
    catch { toast.error('Failed to load complaints'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await complaintAPI.adminUpdate(selected._id, form);
      toast.success('Complaint updated!');
      setSelected(null);
      fetch();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <AdminPageWrapper title="Complaint Management" subtitle="Review customer complaints and respond quickly.">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">Complaint Management</h1>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading ? <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading...</div> :
          complaints.length === 0 ? (
            <div className="text-center py-12">
              <FiMessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No complaints yet</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                      {['User', 'Category', 'Description', 'Status', 'Date', 'Action'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {tablePage.pageItems.map(c => (
                      <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.user?.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{c.user?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">{c.category?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate">{c.description}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                            {c.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => { setSelected(c); setForm({ status: c.status, adminResponse: c.adminResponse || '' }); }}
                            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                            <FiEye className="w-4 h-4" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={tablePage.page} limit={tablePage.limit} total={tablePage.total} onPageChange={tablePage.setPage} />

              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {complaints.map(c => (
                  <div key={c._id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{c.user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{c.user?.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                        {c.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p><span className="font-medium text-gray-700 dark:text-gray-300">Category:</span> {c.category?.replace(/_/g, ' ')}</p>
                      <p className="mt-1">{c.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{new Date(c.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <button onClick={() => { setSelected(c); setForm({ status: c.status, adminResponse: c.adminResponse || '' }); }}
                      className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                      <FiEye className="w-4 h-4" /> View
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {selected && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Complaint Details</h2>
                <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close details">
                  <FiX className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              <div className="space-y-3 mb-4">
                <div><span className="text-xs text-gray-500 dark:text-gray-400">User:</span> <strong className="text-gray-800 dark:text-gray-100">{selected.user?.name}</strong></div>
                <div><span className="text-xs text-gray-500 dark:text-gray-400">Category:</span> <strong className="capitalize text-gray-800 dark:text-gray-100">{selected.category?.replace(/_/g, ' ')}</strong></div>
                <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description:</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selected.description}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm">
                    {['open','in_progress','resolved','closed'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Admin Response</label>
                  <textarea value={form.adminResponse} onChange={e => setForm({...form, adminResponse: e.target.value})} rows={3}
                    placeholder="Respond to the customer..." className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm resize-none" />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={handleUpdate} disabled={saving}
                    className="flex-1 bg-gray-900 dark:bg-gray-700 text-white py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
                    {saving ? 'Saving...' : 'Update'}
                  </button>
                  <button onClick={() => setSelected(null)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
    </AdminPageWrapper>
  );
}
