import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiInstagram, FiFacebook, FiTwitter, FiYoutube, FiLinkedin, FiMail, FiPhone, FiMapPin, FiGlobe,
  FiArrowRight, FiArrowUp, FiAward, FiShield, FiRefreshCw, FiTruck,
} from 'react-icons/fi';
import { FaWhatsapp, FaPinterestP } from 'react-icons/fa';
import BrandLogo from '../common/BrandLogo';
import { settingsAPI } from '../../services/api';
import './PublicJewelryTheme.css';
import './Footer.css';

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.7, delay, ease: [0.2, 0.7, 0.2, 1] },
});

const PROMISES = [
  { icon: FiAward, title: 'BIS Hallmarked', text: 'Purity you can verify' },
  { icon: FiShield, title: 'Certified Diamonds', text: 'IGI · GIA · SGL graded' },
  { icon: FiRefreshCw, title: 'Lifetime Exchange', text: 'On gold & diamond pieces' },
  { icon: FiTruck, title: 'Insured Shipping', text: 'Tamper-proof, across India' },
];

const DEFAULT_COLUMNS = [
  { heading: 'Shop', links: [
    { label: 'All Jewellery', url: '/shop' }, { label: 'New Arrivals', url: '/shop?sort=-createdAt' },
    { label: 'Flash Sale', url: '/shop?isFlashSale=true' }, { label: 'Jewellers Near Me', url: '/nearby' },
  ] },
  { heading: 'Discover', links: [
    { label: 'The Journal', url: '/blogs' }, { label: 'Gold Guide', url: '/blogs?category=Gold%20Guide' },
    { label: 'Bridal Stories', url: '/blogs?category=Bridal' }, { label: 'Sell With Us', url: '/seller/register' },
  ] },
  { heading: 'Customer Care', links: [
    { label: 'Track Your Order', url: '/my-account/tracking' }, { label: 'Returns & Exchange', url: '/my-account/returns' },
    { label: 'FAQ', url: '/faq' }, { label: 'My Account', url: '/my-account' },
  ] },
  { heading: 'Legal', links: [
    { label: 'Privacy Policy', url: '/privacy-policy' }, { label: 'Terms & Conditions', url: '/terms-and-conditions' },
  ] },
];

const SOCIAL_ICONS = { instagram: FiInstagram, facebook: FiFacebook, twitter: FiTwitter, x: FiTwitter, youtube: FiYoutube, linkedin: FiLinkedin, whatsapp: FaWhatsapp, pinterest: FaPinterestP };

// Internal links use the router (no page reload); external ones stay <a>.
function FLink({ url = '#', children, className }) {
  if (url.startsWith('/')) return <Link to={url} className={className}>{children}</Link>;
  return <a href={url} className={className} target={url.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{children}</a>;
}

export default function Footer() {
  // Contact details, columns and socials come from Admin Settings → Footer.
  const [settings, setSettings] = useState(null);
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    settingsAPI.getPublic().then((d) => setSettings(d.settings || null)).catch(() => {});
  }, []);

  const columns = (settings?.footerColumns?.filter((c) => c.heading && c.links?.length).length
    ? settings.footerColumns.filter((c) => c.heading && c.links?.length)
    : DEFAULT_COLUMNS).slice(0, 4);
  const socials = (settings?.footerSocialLinks || []).filter((s) => s.url && s.url !== '#');
  const siteName = settings?.siteName && settings.siteName.toLowerCase() !== 'growthkarts' ? settings.siteName : 'Jewellery';
  const contact = [
    settings?.address && { icon: FiMapPin, value: settings.address },
    settings?.contactPhone && { icon: FiPhone, value: settings.contactPhone, href: `tel:${settings.contactPhone.replace(/\s/g, '')}` },
    settings?.contactEmail && { icon: FiMail, value: settings.contactEmail, href: `mailto:${settings.contactEmail}` },
  ].filter(Boolean);

  const subscribe = (e) => {
    e.preventDefault();
    if (/^\S+@\S+\.\S+$/.test(email)) setJoined(true);
  };

  return (
    <footer className="jf">
      {/* ── Promise strip ─────────────────────────────────────── */}
      <div className="jf-promise">
        <div className="jf-wrap jf-promise-grid">
          {PROMISES.map(({ icon: Icon, title, text }, i) => (
            <motion.div key={title} className="jf-promise-item" {...rise(i * 0.06)}>
              <span className="jf-promise-icon"><Icon /></span>
              <div>
                <p className="jf-promise-title">{title}</p>
                <p className="jf-promise-text">{text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="jf-main">
        {/* ── Newsletter ─────────────────────────────────────── */}
        <div className="jf-wrap">
          <motion.div className="jf-news" {...rise()}>
            <div>
              <span className="jf-eyebrow">The inner circle</span>
              <h3 className="jf-news-title">Be the first to see new collections.</h3>
            </div>
            {joined ? (
              <p className="jf-thanks">Thank you for subscribing — watch your inbox for our next launch.</p>
            ) : (
              <form className="jf-form" onSubmit={subscribe}>
                <input type="email" required placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
                <button type="submit">Subscribe <FiArrowRight /></button>
              </form>
            )}
          </motion.div>
        </div>

        {/* ── Brand + link columns ───────────────────────────── */}
        <div className="jf-wrap jf-grid">
          <motion.div className="jf-brand" {...rise()}>
            <Link to="/" className="jf-logo" aria-label={siteName}><BrandLogo sizeClass="h-12" dark /></Link>
            <p className="jf-about">
              {settings?.footerDescription || 'Thoughtful jewellery for the moments you want to keep close — hallmarked, certified and made to be worn every day.'}
            </p>
            {contact.length > 0 && (
              <ul className="jf-contact">
                {contact.map(({ icon: Icon, value, href }) => (
                  <li key={value}><Icon />{href ? <a href={href}>{value}</a> : <span>{value}</span>}</li>
                ))}
              </ul>
            )}
            {socials.length > 0 && (
              <div className="jf-socials">
                {socials.map((s) => {
                  const Icon = SOCIAL_ICONS[s.platform?.toLowerCase()] || FiGlobe;
                  return (
                    <a key={`${s.platform}-${s.url}`} href={s.url} target="_blank" rel="noreferrer" title={s.platform} aria-label={s.platform} className="jf-social"><Icon /></a>
                  );
                })}
              </div>
            )}
          </motion.div>

          <div className="jf-cols" style={{ '--jf-cols': columns.length }}>
            {columns.map((col, i) => (
              <motion.div key={`${col.heading}-${i}`} className="jf-col" {...rise(0.06 * (i + 1))}>
                <h4>{col.heading}</h4>
                <ul>
                  {(col.links || []).filter((l) => l.label).map((l, j) => (
                    <li key={j}><FLink url={l.url || '#'} className="jf-link">{l.label}</FLink></li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────── */}
        <div className="jf-wrap">
          <div className="jf-bottom">
            <p className="jf-copy">© {new Date().getFullYear()} {siteName}. All rights reserved.</p>
            <div className="jf-legal">
              <Link to="/privacy-policy">Privacy</Link>
              <Link to="/terms-and-conditions">Terms</Link>
              <Link to="/faq">FAQ</Link>
            </div>
            <div className="jf-dev">
              <span>Crafted by</span>
              <img src="/TECAI1.png" alt="TECAI" />
            </div>
            <button type="button" className="jf-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top"><FiArrowUp /></button>
          </div>
        </div>
      </div>
    </footer>
  );
}
