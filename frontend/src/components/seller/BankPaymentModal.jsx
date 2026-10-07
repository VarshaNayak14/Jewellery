import { useState } from 'react';
import { FiX, FiCopy, FiUploadCloud } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { sellerAPI } from '../../services/api';

// Manual bank / UPI-QR payment: shows the platform's QR + bank details
// (Super Admin → Payment Settings), collects the UTR and an optional
// screenshot, and hands them to `onSubmit(reference, screenshot)`.
// Used for offer plans and seller plan renew / switch.
export default function BankPaymentModal({ planName, amount, note, details, onClose, onSubmit }) {
  const [reference, setReference] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const bank = details?.bankDetails || {};
  const copy = (label, value) => navigator.clipboard?.writeText(value).then(() => toast.success(`${label} copied`)).catch(() => {});
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { const data = await sellerAPI.uploadPaymentProof(file); setScreenshot(data.url); toast.success('Screenshot uploaded'); }
    catch (err) { toast.error(err.message || 'Screenshot upload failed'); }
    finally { setUploading(false); event.target.value = ''; }
  };
  const submit = async () => {
    if (reference.trim().length < 6) { toast.error('Please enter your UTR / transaction reference'); return; }
    if (!screenshot) { toast.error('Please upload the payment screenshot'); return; }
    setSubmitting(true);
    try { await onSubmit(reference.trim(), screenshot); }
    catch (err) { toast.error(err.message || 'Could not submit payment'); }
    finally { setSubmitting(false); }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800"><div><h3 className="font-bold text-gray-900 dark:text-gray-100">Pay via Bank / QR</h3><p className="text-xs text-gray-500 dark:text-gray-400">{planName} · ₹{Number(amount || 0).toLocaleString('en-IN')} payable</p></div><button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><FiX /></button></div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">{note}</p>
          {details?.qrCode && <img src={details.qrCode} alt="Payment QR code" className="w-44 h-44 mx-auto object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-white p-1" />}
          {(details?.upiId || bank.accountNumber || bank.bankName) && <div className="bg-gray-50 dark:bg-gray-800/70 rounded-xl p-4 space-y-2">{[['UPI ID', details?.upiId], ['Account Holder', bank.accountHolderName], ['Account Number', bank.accountNumber], ['IFSC Code', bank.ifscCode], ['Bank', bank.bankName]].map(([label, value]) => value && <div key={label} className="flex justify-between gap-3 text-xs"><span className="text-gray-500 dark:text-gray-400">{label}</span><span className="flex items-center gap-1 text-gray-800 dark:text-gray-100 font-medium break-all text-right">{value}<button type="button" onClick={() => copy(label, value)} className="text-gray-400 hover:text-indigo-500"><FiCopy className="w-3 h-3" /></button></span></div>)}</div>}
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UTR / Transaction Reference *</label><input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. 412345678901" className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Screenshot *</label>{screenshot ? <div className="flex items-center gap-3"><img src={screenshot} alt="Payment proof" className="w-16 h-16 rounded-lg object-cover" /><button type="button" onClick={() => setScreenshot('')} className="text-xs text-red-500">Remove</button></div> : <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-pointer"><FiUploadCloud /> {uploading ? 'Uploading...' : 'Upload screenshot'}<input type="file" accept="image/*" onChange={upload} className="hidden" /></label>}</div>
          <button type="button" onClick={submit} disabled={submitting || uploading || !screenshot} className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60">{submitting ? 'Submitting...' : 'Submit Bank Payment'}</button>
        </div>
      </div>
    </div>
  );
}
