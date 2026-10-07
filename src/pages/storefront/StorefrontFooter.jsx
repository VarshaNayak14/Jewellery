import { Link } from 'react-router-dom';
import { FiMapPin, FiPhone, FiMail, FiGlobe } from 'react-icons/fi';
import { FiInstagram, FiFacebook, FiTwitter, FiYoutube, FiLinkedin } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext';

// Seller storefront footer mirrors the main footer while keeping shop data seller-controlled.
export default function StorefrontFooter({ seller, categories, accent, onCategorySelect, basePath }) {
  const { isDark } = useTheme();
  const sellerLogo = seller?.[isDark ? 'darkLogo' : 'lightLogo'] || seller?.logo;
  const fallbackColumns = [
    { heading: 'About Us', subheading: seller?.description || 'Welcome to our store', links: [] },
    { heading: 'Categories', subheading: '', links: categories.map(category => ({ label: category.name, category: category.name })) },
  ];
  const columns = seller?.footerColumns?.length ? seller.footerColumns : fallbackColumns;
  const socialIcons = { instagram: FiInstagram, facebook: FiFacebook, twitter: FiTwitter, youtube: FiYoutube, linkedin: FiLinkedin };
  const legalPath = (slug) => `${basePath || ''}/${slug}`;

  return (
    <footer className="bg-white dark:bg-[#05070f] text-gray-600 dark:text-gray-300 mt-auto border-t border-gray-100 dark:border-0">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="mb-4 flex items-center gap-4">
              {sellerLogo ? <img src={sellerLogo} alt={seller.shopName} className="h-16 sm:h-20 w-auto object-contain flex-shrink-0" /> : <span className="w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl text-white flex-shrink-0" style={{ background: accent }}>{seller?.shopName?.charAt(0) || 'S'}</span>}
              <span className="text-gray-900 dark:text-white font-bold text-xl sm:text-2xl">{seller?.shopName}</span>
            </div>
            <p className="text-sm leading-relaxed mb-6">{seller?.description || 'Welcome to our store.'}</p>
            {seller?.footerSocialLinks?.length > 0 && <div className="flex gap-3">
              {seller.footerSocialLinks.map((social, index) => {
                const Icon = socialIcons[social.platform?.toLowerCase()] || FiGlobe;
                return <a key={`${social.platform}-${index}`} href={social.url || '#'} target={social.url?.startsWith('http') ? '_blank' : undefined} rel="noreferrer" title={social.platform} className="w-9 h-9 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl flex items-center justify-center hover:text-white transition-colors"><Icon className="w-4 h-4" /></a>;
              })}
            </div>}
          </div>

          {columns.slice(0, 2).map((column, index) => (
            <div key={`${column.heading}-${index}`}>
              <h4 className="text-gray-900 dark:text-white font-semibold mb-1">{column.heading || `Column ${index + 1}`}</h4>
              {column.subheading && <p className="text-xs text-gray-500 mb-4">{column.subheading}</p>}
              <ul className="space-y-2 text-sm">
                {(column.links || []).map((link, linkIndex) => <li key={`${link.label}-${linkIndex}`}>{link.category ? <button onClick={() => onCategorySelect(link.category)} className="hover:text-[var(--accent,#60a5fa)] transition-colors capitalize">{link.label}</button> : <a href={link.url || '#'} className="hover:text-[var(--accent,#60a5fa)] transition-colors">{link.label}</a>}</li>)}
                {index === 0 && !seller?.footerColumns?.length && <li><button onClick={() => onCategorySelect()} className="hover:text-[var(--accent,#60a5fa)] transition-colors">All Products</button></li>}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="text-gray-900 dark:text-white font-semibold mb-1">Contact</h4>
            <p className="text-xs text-gray-500 mb-4">We are here to help</p>
            <ul className="space-y-2 text-sm">
              {seller?.address && <li className="flex items-start gap-2"><FiMapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accent }} /><span>{seller.address}</span></li>}
              {seller?.phone && <li className="flex items-center gap-2"><FiPhone className="w-4 h-4 flex-shrink-0" style={{ color: accent }} /><a href={`tel:${seller.phone}`} className="hover:text-[var(--accent,#60a5fa)]">{seller.phone}</a></li>}
              {seller?.footerEmail && <li className="flex items-center gap-2"><FiMail className="w-4 h-4 flex-shrink-0" style={{ color: accent }} /><a href={`mailto:${seller.footerEmail}`} className="hover:text-[var(--accent,#60a5fa)]">{seller.footerEmail}</a></li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="pointer-events-none select-none overflow-hidden">
        <p className="text-center font-black uppercase tracking-tight leading-none whitespace-nowrap bg-clip-text text-transparent" style={{ fontSize: 'clamp(3.5rem, 16vw, 11rem)', backgroundImage: isDark ? 'linear-gradient(to bottom, rgba(96, 165, 250, 0.55) 0%, rgba(59, 130, 246, 0.3) 62%, rgba(59, 130, 246, 0) 100%)' : 'linear-gradient(to bottom, rgba(37, 99, 235, 0.45) 0%, rgba(37, 99, 235, 0.22) 62%, rgba(37, 99, 235, 0) 100%)', WebkitBackgroundClip: 'text' }}>JEWELLERY</p>
      </div>

      <div className="border-t border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-left text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p>© {new Date().getFullYear()} {seller?.shopName || 'Store'}. All rights reserved.</p>
            <Link to={legalPath('privacy-policy')} className="hover:text-[var(--accent,#3b82f6)] transition-colors">Privacy Policy</Link>
            <Link to={legalPath('terms-and-conditions')} className="hover:text-[var(--accent,#3b82f6)] transition-colors">Terms &amp; Conditions</Link>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="text-gray-600 dark:text-gray-300 font-medium">Designed &amp; Developed by</span>
            <img src="/TECAI1.png" alt="Jewellery" className="h-8 w-auto max-w-[100px] object-contain" />
            <img src="/light.jpeg" alt="TEC AI" className="h-8 w-auto max-w-[100px] object-contain" />
          </div>
        </div>
      </div>
    </footer>
  );
}
