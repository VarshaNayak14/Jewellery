import { useEffect, useState } from 'react';
import { FiCreditCard, FiSave, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI, uploadAPI } from '../../services/api';

const inputClass = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40';
const EMPTY = { accountHolder: '', upiId: '', qrCodeImage: '', bankName: '', accountNumber: '', ifsc: '', isEnabled: true };

// Admin / Super Admin: where customers pay for YOUR products.
export default function AdminPaymentDetails() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    adminAPI.getPaymentDetails()
      .then(d => setForm({ ...EMPTY, ...(d.paymentDetails || {}) }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const uploadQr = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error('QR image must be 8MB or smaller'); return; }
    setUploading(true);
    try {
      const up = await uploadAPI.single(file);
      setForm(p => ({ ...p, qrCodeImage: up.url }));
      toast.success('QR uploaded — click Save to keep it');
    } catch (err) { toast.error(err.message || 'Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const d = await adminAPI.savePaymentDetails(form);
      setForm({ ...EMPTY, ...(d.paymentDetails || {}) });
      toast.success('Payment details saved!');
    } catch (err) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="h-40 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />;

  return (
    <form onSubmit={save} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-4">
      <div>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2"><FiCreditCard className="w-4 h-4" /> Payment Details (for my products)</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          When a customer buys a product that <b>you</b> added and pays online, the money goes to the UPI / QR / bank account saved here. You confirm each payment from the Orders page.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={form.isEnabled} onChange={e => setForm(p => ({ ...p, isEnabled: e.target.checked }))} />
        Accept online payments on my products
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Account holder name</label>
          <input className={inputClass} value={form.accountHolder} onChange={set('accountHolder')} placeholder="Name shown to customers" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">UPI ID</label>
          <input className={inputClass} value={form.upiId} onChange={set('upiId')} placeholder="name@bank" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">UPI QR code</label>
          <div className="flex items-center gap-3">
            {form.qrCodeImage && <img src={form.qrCodeImage} alt="QR" className="w-16 h-16 object-contain bg-white rounded-lg border border-gray-200 dark:border-gray-700" />}
            <label className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 ${uploading ? 'opacity-60' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              <FiUpload className="w-3.5 h-3.5" /> {uploading ? 'Uploading…' : form.qrCodeImage ? 'Change QR' : 'Upload QR'}
              <input type="file" accept="image/*" className="hidden" onChange={uploadQr} disabled={uploading} />
            </label>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Bank name</label>
          <input className={inputClass} value={form.bankName} onChange={set('bankName')} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Account number</label>
          <input className={inputClass} value={form.accountNumber} onChange={set('accountNumber')} inputMode="numeric" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">IFSC code</label>
          <input className={`${inputClass} uppercase`} value={form.ifsc} onChange={set('ifsc')} maxLength={11} />
        </div>
      </div>

      <button type="submit" disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
        <FiSave className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Payment Details'}
      </button>
    </form>
  );
}