import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import BrandLogo from '../common/BrandLogo';
import './AuthLayout.css';

/**
 * Two-column jewellery auth shell: a photo panel on the left (hidden on
 * phones) and an ivory form card on the right. Used by customer, seller and
 * courier login/register pages so they all look like the storefront.
 */
export default function AuthLayout({
  image = '/jewelry/necklace.jpg',
  eyebrow,
  title,
  subtitle,
  perks = [],
  footnote,
  formTitle,
  formSubtitle,
  wide = false,
  children,
}) {
  return (
    <div className="auth-shell min-h-[100dvh] flex">
      <aside className="auth-visual hidden lg:flex">
        <img src={image} alt="" className="auth-visual__img" />
        <div className="auth-visual__shade" />
        <div className="relative z-10 flex flex-col justify-between h-full p-12 xl:p-14">
          <Link to="/" className="inline-flex"><BrandLogo sizeClass="h-14" /></Link>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}>
            {eyebrow && <span className="auth-eyebrow">{eyebrow}</span>}
            <h2 className="auth-visual__title">{title}</h2>
            {subtitle && <p className="auth-visual__sub">{subtitle}</p>}
            {perks.length > 0 && (
              <ul className="mt-8 space-y-3.5">
                {perks.map(({ icon: Icon, text }, i) => (
                  <motion.li key={text} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
                    className="flex items-center gap-3 text-sm text-[#f3e6cc]">
                    <span className="auth-perk-icon"><Icon className="w-4 h-4" /></span>
                    {text}
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.div>

          {footnote ? <div className="auth-footnote">{footnote}</div> : <span />}
        </div>
      </aside>

      <main className="auth-form-side flex-1 flex items-start lg:items-center justify-center px-4 py-8 sm:p-8 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
          <div className="lg:hidden text-center mb-6">
            <Link to="/" className="inline-flex"><BrandLogo sizeClass="h-12" /></Link>
          </div>
          <div className="auth-card">
            <div className="auth-card__rule" />
            {formTitle && <h1 className="auth-card__title">{formTitle}</h1>}
            {formSubtitle && <p className="auth-card__sub">{formSubtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

// Shared form pieces so every auth page has the same inputs/buttons.
export function AuthInput({ icon: Icon, label, right, invalid, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="auth-label">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a58a5f]" />}
        <input {...props} className={`auth-input ${Icon ? 'pl-11' : 'pl-4'} ${right ? 'pr-11' : 'pr-4'} ${invalid ? 'auth-input--invalid' : ''}`} />
        {right && <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">{right}</div>}
      </div>
    </div>
  );
}

export function AuthButton({ loading, children, className = '', ...props }) {
  return (
    <button {...props} disabled={loading || props.disabled} className={`auth-btn ${className}`}>
      {loading ? (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : children}
    </button>
  );
}

export function AuthError({ children }) {
  if (!children) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="auth-error">
      {children}
    </motion.div>
  );
}

export function AuthDivider({ children = 'or' }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px auth-hair" />
      <span className="text-[11px] uppercase tracking-[0.2em] text-[#a58a5f]">{children}</span>
      <div className="flex-1 h-px auth-hair" />
    </div>
  );
}
