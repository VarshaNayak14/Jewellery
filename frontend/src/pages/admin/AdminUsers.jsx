import { useState, useEffect } from 'react';
import { FiSearch, FiX, FiShield, FiSlash, FiPlus } from 'react-icons/fi';
import { userAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import Pagination from '../../components/common/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDateShort } from '../../utils/helpers';
import toast from 'react-hot-toast';
import AddCustomerModal from './AddCustomerModal';

export default function AdminUsers({ Wrapper = AdminPageWrapper }) {
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await userAPI.getAll({
        search: debouncedSearch || undefined, page, limit: 20,
        from: dateFrom || undefined, to: dateTo || undefined,
      });
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [debouncedSearch, page, dateFrom, dateTo]);

  const toggleRole = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Make ${user.name} a ${newRole}?`)) return;
    try {
      await userAPI.updateRole(user._id, { role: newRole });
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, role: newRole } : u));
      toast.success('Role updated');
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const toggleStatus = async (user) => {
    try {
      await userAPI.toggleStatus(user._id);
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: !u.isActive } : u));
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`);
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  return (
    <Wrapper
      title="Users"
      subtitle={`${total} total users`}
      actions={
        <button onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          <FiPlus className="w-4 h-4" /> Add Customer
        </button>
      }
    >
      <AddCustomerModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={() => { setPage(1); fetchUsers(); }} />
      {/* Search + date filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative w-full sm:max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search users..."
            className="w-full pl-10 pr-9 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[#111827] text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"><FiX className="w-4 h-4" /></button>}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300" />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Clear</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm dark:shadow-black/20 border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors duration-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800">
              <tr>{['User', 'Email', 'Phone', 'Role', 'Joined', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-3 sm:px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-3 sm:px-4 py-3"><div className="h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" /></td></tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">No users found</td></tr>
              ) : users.map(user => (
                <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-3 sm:px-4 py-3 max-w-[160px]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{user.name}</p>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[180px] truncate">{user.email}</td>
                  <td className="px-3 sm:px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{user.phone || '—'}</td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className={`badge text-xs px-2.5 py-1 whitespace-nowrap ${user.role === 'admin' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateShort(user.createdAt)}</td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className={`badge text-xs px-2.5 py-1 whitespace-nowrap ${user.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => toggleRole(user)} title="Toggle Admin" className="p-2 text-violet-500 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors">
                        <FiShield className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleStatus(user)} title="Toggle Active" className="p-2 text-red-400 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <FiSlash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} limit={20} total={total} onPageChange={setPage} />
      </div>
    </Wrapper>
  );
}