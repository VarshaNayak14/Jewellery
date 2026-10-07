import { useEffect, useState } from 'react';
import { settingsAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const FALLBACK_LOGO = '/logo1.png';

export default function BrandLogo({ className = '', sizeClass = 'h-16', dark = false }) {
  const { isDark } = useTheme();
  const [logos, setLogos] = useState({});

  useEffect(() => {
    settingsAPI.getPublic().then(data => setLogos(data.settings || {})).catch(() => {});
  }, []);

  const src = isDark
    ? (logos.darkLogo || logos.logo || FALLBACK_LOGO)
    : (logos.lightLogo || logos.logo || FALLBACK_LOGO);
  return (
    <img
      src={src}
      alt="Jewellery"
      className={`${sizeClass} w-auto object-contain ${className}`}
      onError={(event) => { event.currentTarget.src = FALLBACK_LOGO; }}
    />
  );
}
