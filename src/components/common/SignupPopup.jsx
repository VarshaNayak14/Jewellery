import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { settingsAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import './SignupPopup.css';

const SEEN_KEY = 'jewel_signup_popup_seen_v2';
const DEFAULTS = {
  enabled: true,
  image: '',
  title: 'Your first purchase, made more rewarding',
  message: 'Sign up now and unlock member-only offers on your first purchase.',
  delaySeconds: 4,
};
// Pages where a sign-up prompt would only get in the way.
const SKIP_PATHS = ['/login', '/register', '/checkout', '/order-confirmation'];

const readSeen = () => { try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; } };
const markSeen = () => { try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ } };

function GiftIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12" aria-hidden="true">
      <rect x="10" y="28" width="44" height="28" rx="3" fill="#2f7f86" />
      <rect x="6" y="20" width="52" height="11" rx="3" fill="#3c9aa1" transform="rotate(-8 32 25)" />
      <rect x="29" y="18" width="7" height="38" fill="#e9f3f3" />
      <path d="M32 19c-6-9-15-8-14-2 1 5 9 4 14 2zm1 0c6-9 15-8 14-2-1 5-9 4-14 2z" fill="#e9f3f3" />
      <circle cx="46" cy="14" r="7" fill="#c99a52" />
      <text x="46" y="17.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">%</text>
    </svg>
  );
}

/**
 * First-visit sign-up popup (ORRA-style). Shown once per browser session to
 * logged-out visitors; closing it — or clicking Sign Up / Log In — marks it
 * seen so it never comes back. Content comes from Admin Settings → Popup.
 */
export default function SignupPopup() {
  const { isAuthenticated } = useAuthStore();
  const { pathname } = useLocation();
  const [config, setConfig] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (readSeen()) return;
    settingsAPI.getPublic()
      .then((d) => setConfig({ ...DEFAULTS, ...(d.settings?.signupPopup || {}) }))
      .catch(() => setConfig(DEFAULTS));
  }, []);

  useEffect(() => {
    if (!config?.enabled || isAuthenticated || readSeen() || open) return undefined;
    if (SKIP_PATHS.some((p) => pathname.startsWith(p))) return undefined;
    const t = setTimeout(() => {
      if (readSeen() || useAuthStore.getState().isAuthenticated) return;
      setOpen(true);
    }, Math.max(0, Number(config.delaySeconds) || 0) * 1000);
    return () => clearTimeout(t);
  }, [config, isAuthenticated, pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (isAuthenticated) {
      markSeen();
      setOpen(false);
    }
  }, [isAuthenticated]);

  const close = () => {
    markSeen();
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && config && (
        <motion.div className="sp-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="sp-title"
            className="sp-card"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sp-media">
              <img src={config.image || '/jewelry/earrings.jpg'} alt="" />
            </div>

            <div className="sp-body">
              <button className="sp-close" onClick={close} aria-label="Close"><FiX className="w-6 h-6" /></button>

              <h2 id="sp-title" className="sp-title">{config.title}</h2>

              <div className="sp-offer">
                <span className="sp-gift"><GiftIcon /></span>
                <p>{config.message}</p>
              </div>

              <div className="sp-actions">
                <Link to="/register" onClick={close} className="sp-btn sp-btn--solid">Sign Up</Link>
                <div className="sp-or"><span>or</span></div>
                <Link to="/login" onClick={close} className="sp-btn sp-btn--outline">Already A Member? Log In</Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
