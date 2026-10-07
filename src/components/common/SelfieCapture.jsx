import { useEffect, useRef, useState } from 'react';
import { FiCamera, FiX, FiRefreshCw, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Take a selfie with the device camera (front camera), or upload a photo if
// there is no camera / permission is refused. `uploadFn(file)` must resolve
// to the uploaded image URL; `onChange(url)` receives it.
export default function SelfieCapture({ value, onChange, uploadFn, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);

  const stop = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  useEffect(() => stop, []);

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { fileRef.current?.click(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      setOpen(true);
      requestAnimationFrame(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } });
    } catch {
      toast.error('Camera not available — upload a photo instead');
      fileRef.current?.click();
    }
  };

  const close = () => { stop(); setOpen(false); };

  const upload = async (file) => {
    setBusy(true);
    try { onChange(await uploadFn(file)); toast.success('Selfie added'); }
    catch (err) { toast.error(err.message || 'Could not upload the selfie'); }
    finally { setBusy(false); }
  };

  const snap = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    // Mirror back so the saved photo isn't flipped like the preview.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      close();
      if (blob) upload(new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
          {value ? <img src={value} alt="Selfie" className="w-full h-full object-cover" /> : <FiCamera className="w-7 h-7 text-gray-400" />}
        </div>
        {!disabled && (
          <div className="flex flex-col gap-2">
            <button type="button" onClick={openCamera} disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
              <FiCamera className="w-4 h-4" /> {busy ? 'Uploading…' : value ? 'Retake selfie' : 'Take selfie'}
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
              className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:underline">
              <FiUpload className="w-3.5 h-3.5" /> Or upload a photo
            </button>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f); }} />

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4" onClick={close}>
          <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl p-4 w-full max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-gray-900 dark:text-gray-100">Take a selfie</p>
              <button type="button" onClick={close} aria-label="Close" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><FiX /></button>
            </div>
            <div className="aspect-square rounded-xl overflow-hidden bg-black">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover -scale-x-100" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Face the camera in good light. No cap, mask or sunglasses.</p>
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={close} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 inline-flex items-center justify-center gap-1.5"><FiRefreshCw className="w-4 h-4" /> Cancel</button>
              <button type="button" onClick={snap} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"><FiCamera className="w-4 h-4" /> Capture</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
