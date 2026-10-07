import { useState } from 'react';
import { FiUpload, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Generic "upload from device" button — used wherever a product form lets
// someone paste an image URL, so they can pick a file instead. `uploadFn`
// takes the selected FileList and resolves to an array of Cloudinary
// secure_urls; callers pass the admin- or seller-scoped upload call (same
// shape, different auth token) so this component stays role-agnostic.
export default function ImageUploadInput({ uploadFn, multiple = false, accept = 'image/*', onUploaded, label = 'Upload from device', maxSizeMB = accept.startsWith('video') ? 200 : 8 }) {
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const tooBig = Array.from(files).find(f => f.size > maxSizeMB * 1024 * 1024);
    if (tooBig) {
      toast.error(`"${tooBig.name}" is over ${maxSizeMB}MB. Please choose a smaller file.`);
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const urls = await uploadFn(files);
      onUploaded(urls);
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <label className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 transition-colors ${uploading ? 'opacity-60' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
      {uploading ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiUpload className="w-3.5 h-3.5" />}
      {uploading ? 'Uploading…' : label}
      <input type="file" accept={accept} multiple={multiple} className="hidden" onChange={handleChange} disabled={uploading} />
    </label>
  );
}
