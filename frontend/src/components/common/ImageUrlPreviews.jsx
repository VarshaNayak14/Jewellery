import { FiX } from 'react-icons/fi';

export default function ImageUrlPreviews({ value = '', onChange }) {
  const images = value.split(',').map(url => url.trim()).filter(Boolean);
  if (!images.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {images.map((url, index) => (
        <div key={`${url}-${index}`} className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <img src={url} alt={`Uploaded product ${index + 1}`} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(images.filter((_, imageIndex) => imageIndex !== index).join(', '))}
            aria-label={`Remove image ${index + 1}`}
            title="Remove image"
            className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-red-600"
          >
            <FiX className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
