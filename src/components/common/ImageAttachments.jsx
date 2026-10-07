import { useRef, useState } from 'react';
import { FiPaperclip, FiX, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';

// "Attach photos" button + thumbnails for a message / ticket form.
// `uploadFn(file)` resolves to the uploaded image URL; `value` is the list of URLs.
export function AttachImagesInput({ value = [], onChange, uploadFn, max = 5, disabled = false }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const pick = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const room = max - value.length;
    if (room <= 0) { toast.error(`You can attach up to ${max} photos`); return; }
    const chosen = files.slice(0, room);
    if (files.length > room) toast(`Only ${room} more photo${room === 1 ? '' : 's'} can be attached`);
    const tooBig = chosen.find(f => f.size > 8 * 1024 * 1024);
    if (tooBig) { toast.error(`"${tooBig.name}" is over 8MB`); return; }
    setUploading(true);
    try {
      const urls = [];
      for (const f of chosen) urls.push(await uploadFn(f));
      onChange([...value, ...urls.filter(Boolean)]);
    } catch (err) { toast.error(err.message || 'Photo upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map(url => (
        <div key={url} className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <img src={url} alt="Attachment" className="w-full h-full object-cover" />
          {!disabled && (
            <button type="button" onClick={() => onChange(value.filter(u => u !== url))} aria-label="Remove photo"
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center">
              <FiX className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      {!disabled && value.length < max && (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60">
          {uploading ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiPaperclip className="w-3.5 h-3.5" />}
          {uploading ? 'Uploading…' : value.length ? 'Add more' : `Attach photos (up to ${max})`}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={pick} />
    </div>
  );
}

// Photos attached to a message — click to open full size.
export function MessageImages({ images }) {
  if (!images?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {images.map(url => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className="block w-20 h-20 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-white/50">
          <img src={url} alt="Attachment" className="w-full h-full object-cover hover:opacity-90" />
        </a>
      ))}
    </div>
  );
}
