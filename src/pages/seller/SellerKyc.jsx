import { useState, useEffect } from 'react';
import { FiShield, FiUpload, FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi';
import { sellerAPI } from '../../services/api';
import { useSellerStore } from '../../store/sellerStore';
import SellerLayout from './SellerLayout';
import ImageUploadInput from '../../components/common/ImageUploadInput';
import SelfieCapture from '../../components/common/SelfieCapture';
import SelectWithOther from '../../components/common/SelectWithOther';

const ADDRESS_PROOF_TYPES = [
  'Aadhaar card (address side)',
  'Electricity / water bill (last 3 months)',
  'Rent / lease agreement',
  'Shop licence / GST certificate',
  'Bank passbook or statement',
  'Voter ID / Driving licence',
];
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  not_submitted: { label: 'Not Submitted', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400', icon: FiClock },
  pending: { label: 'Under Review', color: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', icon: FiClock },
  approved: { label: 'Verified', color: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400', icon: FiCheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400', icon: FiXCircle },
};

export default function SellerKyc() {
  const { seller, updateSeller } = useSellerStore();
  const [form, setForm] = useState({
    panNumber: '', panDocument: '', idDocument: '',
    addressProofType: '', addressProofDocument: '', selfie: '',
    bankDetails: { accountHolder: '', accountNumber: '', ifscCode: '', bankName: '' },
    upiId: '', qrCodeImage: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (seller?.kyc) {
      setForm({
        panNumber: seller.kyc.panNumber || '',
        panDocument: seller.kyc.panDocument || '',
        idDocument: seller.kyc.idDocument || '',
        addressProofType: seller.kyc.addressProofType || '',
        addressProofDocument: seller.kyc.addressProofDocument || '',
        selfie: seller.kyc.selfie || '',
        bankDetails: {
          accountHolder: seller.bankDetails?.accountHolder || '',
          accountNumber: seller.bankDetails?.accountNumber || '',
          ifscCode: seller.bankDetails?.ifscCode || '',
          bankName: seller.bankDetails?.bankName || '',
        },
        upiId: seller.upiId || '',
        qrCodeImage: seller.qrCodeImage || '',
      });
    }
  }, [seller]);

  const kycStatus = seller?.kyc?.status || 'not_submitted';
  const canEdit = kycStatus !== 'pending';
  const config = STATUS_CONFIG[kycStatus];
  const StatusIcon = config.icon;

  const setBank = (key, value) => setForm(p => ({ ...p, bankDetails: { ...p.bankDetails, [key]: value } }));
  const uploadSingle = (files) => sellerAPI.uploadImage(files[0]).then(data => data.url);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { accountHolder, accountNumber, ifscCode, bankName } = form.bankDetails;
    if (!form.panNumber || !form.panDocument || !form.idDocument) {
      toast.error('Please fill all identity document fields');
      return;
    }
    if (!form.addressProofType || !form.addressProofDocument) {
      toast.error('Add your address proof — choose the document type and upload its photo');
      return;
    }
    if (!form.selfie) {
      toast.error('Take a selfie to complete your KYC');
      return;
    }
    if (!accountHolder || !accountNumber || !ifscCode || !bankName) {
      toast.error('Bank details are mandatory — this is where your payments will be sent');
      return;
    }
    if (!form.upiId && !form.qrCodeImage) {
      toast.error('Add a UPI ID or QR code so customers can pay you');
      return;
    }
    setSaving(true);
    try {
      const data = await sellerAPI.submitKyc(form);
      updateSeller(data.seller);
      toast.success('KYC submitted for review!');
    } catch (err) { toast.error(err.message || 'Failed to submit KYC'); }
    finally { setSaving(false); }
  };

  return (
    <SellerLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">KYC Verification</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Mandatory — your identity documents and bank details are required before any customer payment can be paid out to you</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
            <StatusIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{config.label}</p>
            {kycStatus === 'rejected' && seller?.kyc?.rejectionReason && (
              <p className="text-xs text-red-600 mt-0.5">Reason: {seller.kyc.rejectionReason}</p>
            )}
            {kycStatus === 'pending' && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Our team is reviewing your documents.</p>}
            {kycStatus === 'approved' && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">You can update your KYC. Changes will need approval again.</p>}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-5 flex items-center gap-2">
          <FiShield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Identity Documents
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PAN Number *</label>
            <input type="text" value={form.panNumber} disabled={!canEdit}
              onChange={(e) => setForm(p => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
              placeholder="ABCDE1234F" maxLength={10}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800/60" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PAN Card Document (image URL) *</label>
            <input type="text" value={form.panDocument} disabled={!canEdit}
              onChange={(e) => setForm(p => ({ ...p, panDocument: e.target.value }))}
              placeholder="https://your-upload-url.com/pan.jpg"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800/60" />
            {canEdit && <ImageUploadInput uploadFn={uploadSingle} onUploaded={(url) => setForm(p => ({ ...p, panDocument: url }))} />}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID Proof — Aadhaar/Voter ID (image URL) *</label>
            <input type="text" value={form.idDocument} disabled={!canEdit}
              onChange={(e) => setForm(p => ({ ...p, idDocument: e.target.value }))}
              placeholder="https://your-upload-url.com/id.jpg"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800/60" />
            {canEdit && <ImageUploadInput uploadFn={uploadSingle} onUploaded={(url) => setForm(p => ({ ...p, idDocument: url }))} />}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Use direct image URLs (Cloudinary, Imgur, etc.) — same as your shop logo/banner.</p>
        </div>

        {/* Address verification */}
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mt-8 mb-1 flex items-center gap-2">
          <FiShield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Address Verification
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">A document showing your shop or home address. It should match the address on your profile.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address proof type *</label>
            {/* Not in the list? "Other" lets the seller type the document name */}
            <SelectWithOther value={form.addressProofType} disabled={!canEdit}
              onChange={(v) => setForm(p => ({ ...p, addressProofType: v }))}
              options={ADDRESS_PROOF_TYPES.map(t => ({ value: t, label: t }))}
              placeholder="Choose a document…" otherLabel="Other (type the document name)"
              otherPlaceholder="e.g. Gas connection bill, Property tax receipt"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800/60" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address proof photo *</label>
            <input type="text" value={form.addressProofDocument} disabled={!canEdit}
              onChange={(e) => setForm(p => ({ ...p, addressProofDocument: e.target.value }))}
              placeholder="https://your-upload-url.com/address-proof.jpg"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800/60" />
            {canEdit && <ImageUploadInput uploadFn={uploadSingle} onUploaded={(url) => setForm(p => ({ ...p, addressProofDocument: url }))} />}
            {form.addressProofDocument && <img src={form.addressProofDocument} alt="Address proof" className="mt-2 h-24 rounded-lg border border-gray-200 dark:border-gray-700 object-cover" />}
          </div>
        </div>

        {/* Selfie */}
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mt-8 mb-1 flex items-center gap-2">
          <FiShield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Selfie *
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">A clear photo of your face — our team matches it with your ID proof.</p>
        <SelfieCapture value={form.selfie} disabled={!canEdit}
          uploadFn={(file) => sellerAPI.uploadImage(file).then(d => d.url)}
          onChange={(url) => setForm(p => ({ ...p, selfie: url }))} />
      </form>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mt-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          <FiShield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Bank Details for Payouts
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">Every payment a customer makes for your products is collected first, then paid out to this account.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Holder Name *</label>
            <input type="text" value={form.bankDetails.accountHolder} disabled={!canEdit}
              onChange={(e) => setBank('accountHolder', e.target.value)}
              placeholder="As per bank passbook"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800/60" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Number *</label>
            <input type="text" value={form.bankDetails.accountNumber} disabled={!canEdit}
              onChange={(e) => setBank('accountNumber', e.target.value.replace(/\D/g, ''))}
              placeholder="9–18 digit account number" maxLength={18}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800/60" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IFSC Code *</label>
              <input type="text" value={form.bankDetails.ifscCode} disabled={!canEdit}
                onChange={(e) => setBank('ifscCode', e.target.value.toUpperCase())}
                placeholder="SBIN0001234" maxLength={11}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800/60" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name *</label>
              <input type="text" value={form.bankDetails.bankName} disabled={!canEdit}
                onChange={(e) => setBank('bankName', e.target.value)}
                placeholder="e.g. State Bank of India"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800/60" />
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5 mt-2">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Customer Payment Details</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Customers will use this UPI ID or QR code to pay for your products after KYC approval.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UPI ID</label>
                <input type="text" value={form.upiId} disabled={!canEdit}
                  onChange={(e) => setForm(p => ({ ...p, upiId: e.target.value.trim() }))}
                  placeholder="shopname@upi"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800/60" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">QR Code Image URL</label>
                <input type="url" value={form.qrCodeImage} disabled={!canEdit}
                  onChange={(e) => setForm(p => ({ ...p, qrCodeImage: e.target.value }))}
                  placeholder="https://.../upi-qr.png"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800/60" />
                {canEdit && <ImageUploadInput uploadFn={uploadSingle} onUploaded={(url) => setForm(p => ({ ...p, qrCodeImage: url }))} label="Upload QR from device" />}
              </div>
            </div>
            {form.qrCodeImage && <img src={form.qrCodeImage} alt="UPI QR preview" className="w-32 h-32 object-contain mt-4 rounded-xl border border-gray-200 dark:border-gray-700 p-2" />}
          </div>
        </div>

        {canEdit && (
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 mt-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:opacity-90 disabled:opacity-60 transition-all shadow-lg text-sm">
            <FiUpload className="w-5 h-5" />
            {saving ? 'Submitting...' : kycStatus === 'approved' ? 'Submit Updated KYC for Review' : kycStatus === 'rejected' ? 'Resubmit for Review' : 'Submit for Review'}
          </button>
        )}
      </form>
    </SellerLayout>
  );
}