import { useState, useEffect } from 'react';
import { FiX, FiPlay, FiCamera, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { uploadAPI } from '../../services/api';

// Keep in sync with MAX_REVIEW_IMAGES / MAX_REVIEW_VIDEOS in
// backend/src/controllers/reviewController.js.
export const MAX_REVIEW_IMAGES = 5;
export const MAX_REVIEW_VIDEOS = 2;
const MAX_IMAGE_MB = 8;
const MAX_VIDEO_MB = 50;

// The "#t=0.1" media fragment makes browsers paint the first frame of a video
// while it is only preloading metadata, so it can be used as its own thumbnail.
const videoThumbSrc = (url) => `${url}#t=0.1`;

function Lightbox({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
        <FiX className="w-6 h-6" />
      </button>
      <div onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full">
        {item.type === 'video' ? (
          <video src={item.url} controls autoPlay playsInline className="max-w-full max-h-[85vh] rounded-lg bg-black" />
        ) : (
          <img src={item.url} alt="" className="max-w-full max-h-[85vh] rounded-lg object-contain" />
        )}
      </div>
    </div>
  );
}

// Read-only thumbnails of a review's photos and videos; click opens a viewer.
export function ReviewMedia({ images = [], videos = [], className = '', size = 'md' }) {
  const [active, setActive] = useState(null);
  if (!images?.length && !videos?.length) return null;
  const tile = size === 'lg' ? 'w-24 h-24 rounded-xl' : 'w-16 h-16 rounded-lg';

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {images.map((url, i) => (
          <button key={`i${i}`} type="button" onClick={() => setActive({ type: 'image', url })}
            className={`${tile} overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-gray-800`}>
            <img src={url} alt="Review photo" loading="lazy" className="w-full h-full object-cover" />
          </button>
        ))}
        {videos.map((url, i) => (
          <button key={`v${i}`} type="button" onClick={() => setActive({ type: 'video', url })}
            className={`relative ${tile} overflow-hidden border border-gray-200 dark:border-white/10 bg-black`}>
            <video src={videoThumbSrc(url)} preload="metadata" muted playsInline className="w-full h-full object-cover pointer-events-none" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/30">
              <FiPlay className="w-5 h-5 text-white fill-white" />
            </span>
          </button>
        ))}
      </div>
      {active && <Lightbox item={active} onClose={() => setActive(null)} />}
    </>
  );
}

// Photo + video picker for the review forms. Controlled: `images` / `videos`
// hold the uploaded URLs and `onChange({ images, videos })` reports edits.
export function ReviewMediaUploader({ images, videos, onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (!picked.length) return;

    let imageSlots = MAX_REVIEW_IMAGES - images.length;
    let videoSlots = MAX_REVIEW_VIDEOS - videos.length;
    const accepted = [];
    let skipped = 0;

    for (const file of picked) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) { skipped++; continue; }
      if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) { toast.error(`"${file.name}" is over ${MAX_VIDEO_MB}MB`); continue; }
      if (isImage && file.size > MAX_IMAGE_MB * 1024 * 1024) { toast.error(`"${file.name}" is over ${MAX_IMAGE_MB}MB`); continue; }
      if (isVideo ? videoSlots <= 0 : imageSlots <= 0) { skipped++; continue; }
      if (isVideo) videoSlots--; else imageSlots--;
      accepted.push(file);
    }

    if (skipped) toast.error(`You can add up to ${MAX_REVIEW_IMAGES} photos and ${MAX_REVIEW_VIDEOS} videos`);
    if (!accepted.length) return;

    setUploading(true);
    try {
      const data = await uploadAPI.reviewMedia(accepted);
      onChange({ images: [...images, ...(data.images || [])], videos: [...videos, ...(data.videos || [])] });
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const canAdd = images.length < MAX_REVIEW_IMAGES || videos.length < MAX_REVIEW_VIDEOS;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {images.map((url) => (
          <div key={url} className="relative w-16 h-16">
            <img src={url} alt="" className="w-full h-full rounded-lg object-cover" />
            <button type="button" aria-label="Remove photo" onClick={() => onChange({ images: images.filter((u) => u !== url), videos })}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
              <FiX className="w-3 h-3" />
            </button>
          </div>
        ))}
        {videos.map((url) => (
          <div key={url} className="relative w-16 h-16">
            <video src={videoThumbSrc(url)} preload="metadata" muted playsInline className="w-full h-full rounded-lg object-cover bg-black" />
            <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30 pointer-events-none">
              <FiPlay className="w-5 h-5 text-white fill-white" />
            </span>
            <button type="button" aria-label="Remove video" onClick={() => onChange({ images, videos: videos.filter((u) => u !== url) })}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
              <FiX className="w-3 h-3" />
            </button>
          </div>
        ))}
        {canAdd && (
          <label className={`w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400 transition-colors ${uploading ? 'opacity-60' : 'cursor-pointer hover:border-blue-400 hover:text-blue-500'}`}>
            {uploading ? <FiLoader className="w-5 h-5 animate-spin" /> : <FiCamera className="w-5 h-5" />}
            <span className="text-[10px] mt-0.5">{uploading ? 'Uploading' : 'Add'}</span>
            <input type="file" accept="image/*,video/*" multiple disabled={uploading} onChange={handleFiles} className="hidden" />
          </label>
        )}
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
        Up to {MAX_REVIEW_IMAGES} photos ({MAX_IMAGE_MB}MB each) and {MAX_REVIEW_VIDEOS} videos ({MAX_VIDEO_MB}MB each).
      </p>
    </div>
  );
}
