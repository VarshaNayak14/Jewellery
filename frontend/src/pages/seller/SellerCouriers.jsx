import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTruck, FiPlus, FiX, FiCheckCircle, FiEdit2, FiTrash2, FiLock, FiUnlock, FiPackage } from 'react-icons/fi';
import { sellerAPI } from '../../services/api';
import { formatPrice } from '../../utils/helpers';
import SellerLayout from './SellerLayout';
import toast from 'react-hot-toast';
import PasswordInput from '../../components/common/PasswordInput';
import Pagination from '../../components/common/Pagination';
import { usePagedList } from '../../hooks/usePagedList';

// Orders in these statuses can be handed off to a courier. Some COD orders
// are still `pending` when they first come in, but they still need to appear
// in the assign modal so the seller can dispatch them immediately.
const ASSIGNABLE_STATUSES = ['pending', 'confirmed', 'packed', 'ready_for_pickup'];

const STATUS_STYLES = {
  approved: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
  pending: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  suspended: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
};

const emptyForm = { name: '', email: '', password: '', phone: '', vehicleType: 'Bike', vehicleNumber: '', perDeliveryFee: '' };

export default function SellerCouriers() {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [couriers, setCouriers] = useState([]);
  // Table shows 20 rows per page.
  const tablePage = usePagedList(couriers);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }));

  // Assign Orders modal — the reverse of SellerOrders.jsx's per-order
  // "Assign Courier": start from a courier, pick which of the seller's
  // ready-to-ship orders go to them.
  const [assignCourierFor, setAssignCourierFor] = useState(null);
  const [assignableOrders, setAssignableOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [assigning, setAssigning] = useState(false);

  const loadCouriers = async () => {
    setLoading(true);
    try { const data = await sellerAPI.getCouriers(); setCouriers(data.couriers || []); }
    catch (error) { toast.error(error.message || 'Unable to load couriers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCouriers(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };

  const openEdit = (courier) => {
    setForm({
      name: courier.user?.name || '',
      email: courier.user?.email || '',
      password: '',
      phone: courier.user?.phone || '',
      vehicleType: courier.vehicleType || 'Bike',
      vehicleNumber: courier.vehicleNumber || '',
      perDeliveryFee: courier.perDeliveryFee || '',
    });
    setEditId(courier._id);
    setShowForm(true);
  };

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await sellerAPI.updateCourier(editId, {
          name: form.name, phone: form.phone, vehicleType: form.vehicleType,
          vehicleNumber: form.vehicleNumber, perDeliveryFee: form.perDeliveryFee,
        });
        toast.success('Courier updated');
      } else {
        await sellerAPI.createCourier(form);
        toast.success('Courier account created — ready to assign');
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditId(null);
      loadCouriers();
    } catch (error) { toast.error(error.message || 'Unable to save courier'); }
    finally { setSaving(false); }
  };

  const toggleBlock = async (courier) => {
    setUpdatingId(courier._id);
    try {
      const data = await sellerAPI.toggleCourierBlock(courier._id);
      setCouriers(prev => prev.map(c => c._id === courier._id ? { ...c, user: { ...c.user, isActive: data.courier.user.isActive } } : c));
      toast.success(data.message);
    } catch (error) { toast.error(error.message || 'Unable to update courier'); }
    finally { setUpdatingId(null); }
  };

  const handleDelete = async (courier) => {
    if (!window.confirm(`Delete ${courier.user?.name}? This removes their login and courier record permanently.`)) return;
    setUpdatingId(courier._id);
    try {
      await sellerAPI.deleteCourier(courier._id);
      toast.success('Courier deleted');
      setCouriers(prev => prev.filter(c => c._id !== courier._id));
    } catch (error) { toast.error(error.message || 'Unable to delete courier'); }
    finally { setUpdatingId(null); }
  };

  const openAssignOrders = async (courier) => {
    setAssignCourierFor(courier);
    setSelectedOrderIds([]);
    setLoadingOrders(true);
    try {
      const data = await sellerAPI.getOrders();
      const ready = (data.orders || []).filter(o => ASSIGNABLE_STATUSES.includes(o.status) && !o.assignedCourier);
      setAssignableOrders(ready);
    } catch (error) { toast.error(error.message || 'Unable to load orders'); }
    finally { setLoadingOrders(false); }
  };

  const toggleOrderSelected = (id) => {
    setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAssignOrders = async () => {
    if (!selectedOrderIds.length) { toast.error('Select at least one order'); return; }
    setAssigning(true);
    try {
      await Promise.all(selectedOrderIds.map(orderId =>
        sellerAPI.assignCourierToOrder(orderId, { courierId: assignCourierFor._id })
      ));
      toast.success(`${selectedOrderIds.length} order(s) assigned to ${assignCourierFor.user?.name}! 🚚`);
      setAssignCourierFor(null);
    } catch (error) { toast.error(error.message || 'Failed to assign some orders'); }
    finally { setAssigning(false); }
  };

  return (
    <SellerLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Delivery Partners</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{couriers.length} total · add your own couriers and assign them directly to orders</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-sm"
          >
            <FiPlus className="w-4 h-4" /> Add Courier
          </button>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                <tr>{['Courier', 'Contact', 'Vehicle', 'Fee', 'Status', 'Login', 'Actions'].map(h => (
                  <th key={h} className="text-left px-3 sm:px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-3 sm:px-4 py-3"><div className="h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" /></td></tr>
                  ))
                ) : couriers.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
                    <FiTruck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No couriers added yet — click "Add Courier" to create one.
                  </td></tr>
                ) : (
                  tablePage.pageItems.map(courier => {
                    const blocked = courier.user?.isActive === false;
                    return (
                      <tr key={courier._id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 ${blocked ? 'opacity-60' : ''}`}>
                        <td className="px-3 sm:px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                              <FiTruck className="w-4 h-4" />
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{courier.user?.name}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                          <p>{courier.user?.email}</p>
                          {courier.user?.phone && <p>{courier.user.phone}</p>}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {courier.vehicleType}{courier.vehicleNumber ? ` · ${courier.vehicleNumber}` : ''}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {courier.perDeliveryFee > 0 ? `₹${courier.perDeliveryFee}` : '—'}
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${STATUS_STYLES[courier.status] || ''}`}>{courier.status}</span>
                          {(courier.status === 'pending' || courier.status === 'approved') && (
                            <p className="text-[11px] text-green-600 dark:text-green-400 mt-1 flex items-center gap-1"><FiCheckCircle className="w-3 h-3" /> Ready to assign</p>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${blocked ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' : 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'}`}>
                            {blocked ? 'Blocked' : 'Active'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {courier.status !== 'suspended' && !blocked && (
                              <button onClick={() => openAssignOrders(courier)} title="Assign Orders"
                                className="p-1.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10">
                                <FiPackage className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button disabled={updatingId === courier._id} onClick={() => toggleBlock(courier)}
                              title={blocked ? 'Unblock login' : 'Block login'}
                              className={`p-1.5 rounded-lg disabled:opacity-50 ${blocked ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10' : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}>
                              {blocked ? <FiUnlock className="w-3.5 h-3.5" /> : <FiLock className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => openEdit(courier)} title="Edit"
                              className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            <button disabled={updatingId === courier._id} onClick={() => handleDelete(courier)} title="Delete"
                              className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50">
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={tablePage.page} limit={tablePage.limit} total={tablePage.total} onPageChange={tablePage.setPage} />
        </div>
      </div>

      {/* Add / Edit Courier Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-3 sm:p-4 overflow-y-auto" onClick={() => setShowForm(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-lg my-4 sm:my-8 shadow-2xl">
              <div className="flex items-center justify-between mb-5 sm:mb-6 gap-2">
                <div>
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-base sm:text-lg">{editId ? 'Edit Courier' : 'Add Courier'}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {editId ? 'Email and password can\'t be changed here.' : 'Create a courier and assign them directly to orders with no approval step.'}
                  </p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg shrink-0"><FiX className="w-5 h-5 dark:text-gray-300" /></button>
              </div>

              <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase sm:col-span-2">
                  Full name
                  <input required type="text" value={form.name} onChange={set('name')}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl font-normal normal-case focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </label>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase sm:col-span-2">
                  Email
                  <input required={!editId} disabled={!!editId} type="email" value={form.email} onChange={set('email')}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-800/60 disabled:text-gray-400 dark:disabled:text-gray-500 text-gray-800 dark:text-gray-100 rounded-xl font-normal normal-case focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </label>
                {!editId && (
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase sm:col-span-2">
                    Temporary password
                    <PasswordInput required value={form.password} onChange={set('password')} wrapperClassName="mt-1"
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl font-normal normal-case focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </label>
                )}
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Phone
                  <input type="text" value={form.phone} onChange={set('phone')}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl font-normal normal-case focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </label>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Vehicle number
                  <input type="text" value={form.vehicleNumber} onChange={set('vehicleNumber')}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl font-normal normal-case focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </label>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Fee per delivery (₹)
                  <input type="number" value={form.perDeliveryFee} onChange={set('perDeliveryFee')}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl font-normal normal-case focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </label>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Vehicle type
                  <select value={form.vehicleType} onChange={set('vehicleType')}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl font-normal normal-case">
                    <option>Bike</option><option>Scooter</option><option>Car</option><option>Van</option>
                  </select>
                </label>
                <div className="sm:col-span-2">
                  <button disabled={saving} className="w-full px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-60 hover:bg-indigo-700 transition-colors">
                    {saving ? 'Saving...' : editId ? 'Save Changes' : 'Create Courier'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Orders modal — courier-first assignment */}
      <AnimatePresence>
        {assignCourierFor && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-3 sm:p-4 overflow-y-auto" onClick={() => setAssignCourierFor(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-lg my-4 sm:my-8 shadow-2xl">
              <div className="flex items-center justify-between mb-5 gap-2">
                <div>
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-base sm:text-lg">Assign Orders</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">To {assignCourierFor.user?.name} — pick the orders they'll deliver.</p>
                </div>
                <button onClick={() => setAssignCourierFor(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg shrink-0"><FiX className="w-5 h-5 dark:text-gray-300" /></button>
              </div>

              {loadingOrders ? (
                <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm">Loading orders...</div>
              ) : assignableOrders.length === 0 ? (
                <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm">
                  <FiPackage className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No orders ready to assign right now. An order needs to be Confirmed/Packed/Ready for Pickup and not already have a courier.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {assignableOrders.map(order => (
                    <label key={order._id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer">
                      <input type="checkbox" checked={selectedOrderIds.includes(order._id)} onChange={() => toggleOrderSelected(order._id)}
                        className="w-4 h-4 rounded accent-indigo-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">#{order.orderNumber}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{order.user?.name || order.user?.email || 'Customer'} · {order.items?.length || 0} item(s)</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatPrice(Math.max(Number(order.totalPrice || 0) - Number(order.walletAmountUsed || 0), 0))}</span>
                    </label>
                  ))}
                </div>
              )}

              <button onClick={handleAssignOrders} disabled={assigning || !selectedOrderIds.length}
                className="w-full mt-5 px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-60 hover:bg-indigo-700 transition-colors">
                {assigning ? 'Assigning...' : `🚚 Assign ${selectedOrderIds.length || ''} Order${selectedOrderIds.length === 1 ? '' : 's'}`}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SellerLayout>
  );
}