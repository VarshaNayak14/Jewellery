import { useEffect, useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { settingsAPI } from '../../services/api';
import { toWhatsappNumber } from '../../utils/helpers';

// Round WhatsApp chat button fixed to the bottom-right of the main website.
// Number: Admin → Settings → General → "WhatsApp Number" (or Contact Phone).
// Hidden when no number is set.
export default function FloatingWhatsApp() {
  const [number, setNumber] = useState('');

  useEffect(() => {
    settingsAPI.getPublic()
      .then(d => setNumber(toWhatsappNumber(d.settings?.whatsappNumber || d.settings?.contactPhone || '')))
      .catch(() => {});
  }, []);

  if (!number) return null;
  const text = encodeURIComponent('Hi growthkarts, I need some help.');

  return (
    <a
      href={`https://wa.me/${number}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
      className="group fixed z-40 bottom-5 right-5 sm:bottom-6 sm:right-6 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
    >
      <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 animate-ping motion-reduce:hidden" aria-hidden="true" />
      <FaWhatsapp className="relative w-8 h-8" />
      {/* Unread-style dot to draw attention */}
      <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900" aria-hidden="true" />
      <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-gray-900 text-white text-xs font-medium px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
        Chat with us
      </span>
    </a>
  );
}
