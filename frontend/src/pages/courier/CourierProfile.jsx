import { useEffect, useState } from 'react';
import { FiTruck, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { courierAPI } from '../../services/api';
import { formatPrice } from '../../utils/helpers';
import AccountSettings from '../../components/common/AccountSettings';
import ToggleSwitch from '../../components/common/ToggleSwitch';
import CourierLayout from './CourierLayout';

const VEHICLE_TYPES = ['Bike', 'Scooter', 'Cycle', 'Auto', 'Van', 'Truck'];
const inputClass = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40';

function DeliveryDetails() {
  const [courier, setCourier] = useState(null);
  const [form, setForm] = useState({ vehicleType: 'Bike', vehicleNumber: '', currentLocation: '', isAvailable: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    courierAPI.getMe().then(data => {
      const c = data.courier || {};
      setCourier(c);
      setForm({ vehicleType: c.vehicleType || 'Bike', vehicleNumber: c.vehicleNumber || '', currentLocation: c.currentLocation || '', isAvailable: c.isAvailable !== false });
    }).catch(err => toast.error(err.message || 'Could not load courier details'));
  }, []);

  const save = async (patch) => {
    setSaving(true);
    try {
      const data = await courierAPI.updateMe(patch);
      setCourier(data.courier);
      setForm(p => ({ ...p, ...patch, vehicleNumber: data.courier.vehicleNumber }));
      toast.success('Delivery details saved');
    } catch (err) { toast.error(err.message || 'Could not save details'); }
    finally { setSaving(false); }
  };

  // Availability saves instantly — it decides whether admin/seller can pick you for new orders.
  const toggleAvailable = () => { if (!saving) save({ isAvailable: !form.isAvailable }); };

  const vehicleOptions = VEHICLE_TYPES.includes(form.vehicleType) ? VEHICLE_TYPES : [form.vehicleType, ...VEHICLE_TYPES];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm mb-6">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
        <FiTruck className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Delivery Details
      </h3>
      {!courier ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 mb-5">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {form.isAvailable ? 'Available for new deliveries' : 'Not available'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {form.isAvailable ? 'Admin / seller can assign new orders and return pickups to you.' : 'You won’t appear in the list for new assignments.'}
              </p>
            </div>
            <ToggleSwitch checked={form.isAvailable} onChange={toggleAvailable} color="bg-green-600" />
          </div>

          <form onSubmit={e => { e.preventDefault(); save({ vehicleType: form.vehicleType, vehicleNumber: form.vehicleNumber, currentLocation: form.currentLocation }); }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Vehicle Type</label>
              <select value={form.vehicleType} onChange={e => setForm(p => ({ ...p, vehicleType: e.target.value }))} className={inputClass}>
                {vehicleOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Vehicle Number</label>
              <input value={form.vehicleNumber} onChange={e => setForm(p => ({ ...p, vehicleNumber: e.target.value }))} placeholder="MP09 AB 1234" className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Current Area</label>
              <input value={form.currentLocation} onChange={e => setForm(p => ({ ...p, currentLocation: e.target.value }))} placeholder="e.g. Vijay Nagar, Indore" className={inputClass} />
            </div>
            <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Fee per delivery: <span className="font-semibold text-gray-700 dark:text-gray-200">{formatPrice(courier.perDeliveryFee || 0)}</span>
                {' · '}Added by: <span className="font-semibold text-gray-700 dark:text-gray-200">{courier.seller?.shopName || 'growthkarts (platform)'}</span>
              </p>
              <button disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
                <FiSave className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Details'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default function CourierProfile() {
  return (
    <CourierLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your delivery details, account information and password</p>
      </div>
      <DeliveryDetails />
      <AccountSettings />
    </CourierLayout>
  );
}
