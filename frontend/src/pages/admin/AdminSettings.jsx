import { useState, useEffect } from 'react';
import { FiSave, FiPlus, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { settingsAPI, uploadAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import ImageUploadInput from '../../components/common/ImageUploadInput';
import ToggleSwitch from '../../components/common/ToggleSwitch';
import LegalPagesEditor from './LegalPagesEditor';
import { useAuthStore } from '../../store/authStore';

const tabs = ['General', 'Marquee', 'Popup', 'Homepage', 'Instagram', 'Footer', 'Pages', 'Payment'];

export default function AdminSettings({ Wrapper = AdminPageWrapper, initialTab = 'General' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Marquee messages are stored as an array in the DB but edited here as
  // one line per message — keep a separate text buffer so partial lines
  // (mid-typing) don't get mangled by immediately splitting on every keystroke.
  const [marqueeText, setMarqueeText] = useState('');
  const isSuperAdmin = useAuthStore((state) => state.user?.role === 'superadmin');
  const visibleTabs = isSuperAdmin ? tabs : tabs.filter((tab) => tab !== 'Instagram');

  useEffect(() => {
    settingsAPI.get().then(d => {
      const loaded = d.settings || {};
      setSettings({
        ...loaded,
        footerColumns: loaded.footerColumns?.length ? loaded.footerColumns : [
          { heading: 'Shop', subheading: 'Explore our collection', links: [{ label: 'All Products', url: '/shop' }] },
          { heading: 'Customer Care', subheading: 'We are here to help', links: [] },
          { heading: 'Stay Connected', subheading: '', links: [] },
        ],
        footerSocialLinks: loaded.footerSocialLinks || [],
        instagramPosts: loaded.instagramPosts || [],
      });
      setMarqueeText((d.settings?.marqueeMessages || []).join('\n'));
    }).catch(() => toast.error('Failed to load settings')).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...settings,
        marqueeMessages: marqueeText.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 2),
      };
      await settingsAPI.update(payload);
      setSettings(payload);
      toast.success('Settings saved!');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const set = (key, val) => setSettings(s => ({...s, [key]: val}));
  const setPopup = (key, val) => setSettings(s => ({ ...s, signupPopup: { ...(s.signupPopup || {}), [key]: val } }));
  // bankDetails is a nested object in the DB — merge into it instead of overwriting
  const setBank = (key, val) => setSettings(s => ({...s, bankDetails: {...(s.bankDetails || {}), [key]: val}}));

  // homepageSections is a nested object with 3 named sections, each holding
  // a title/subtitle and an items array — these helpers update one piece at
  // a time immutably without disturbing the rest of the settings object.
  const setHomeField = (section, field, val) => setSettings(s => ({
    ...s,
    homepageSections: {
      ...(s.homepageSections || {}),
      [section]: { ...(s.homepageSections?.[section] || {}), [field]: val },
    },
  }));

  const setHomeItem = (section, idx, field, val) => setSettings(s => {
    const sec = s.homepageSections?.[section] || {};
    const items = Array.isArray(sec.items) ? [...sec.items] : [];
    items[idx] = { ...(items[idx] || {}), [field]: val };
    return { ...s, homepageSections: { ...(s.homepageSections || {}), [section]: { ...sec, items } } };
  });

  const addHomeItem = (section, blankItem) => setSettings(s => {
    const sec = s.homepageSections?.[section] || {};
    const items = Array.isArray(sec.items) ? [...sec.items, blankItem] : [blankItem];
    return { ...s, homepageSections: { ...(s.homepageSections || {}), [section]: { ...sec, items } } };
  });

  const removeHomeItem = (section, idx) => setSettings(s => {
    const sec = s.homepageSections?.[section] || {};
    const items = Array.isArray(sec.items) ? sec.items.filter((_, i) => i !== idx) : [];
    return { ...s, homepageSections: { ...(s.homepageSections || {}), [section]: { ...sec, items } } };
  });

  const setFooterColumn = (index, key, value) => setSettings(s => ({ ...s, footerColumns: (s.footerColumns || []).map((column, i) => i === index ? { ...column, [key]: value } : column) }));
  const setFooterLink = (columnIndex, linkIndex, key, value) => setSettings(s => ({
    ...s,
    footerColumns: (s.footerColumns || []).map((column, i) => i === columnIndex
      ? { ...column, links: (column.links || []).map((link, j) => j === linkIndex ? { ...link, [key]: value } : link) }
      : column),
  }));
  const addFooterColumn = () => setSettings(s => ({ ...s, footerColumns: [...(s.footerColumns || []), { heading: '', subheading: '', links: [{ label: '', url: '' }] }] }));
  const removeFooterColumn = (index) => setSettings(s => ({ ...s, footerColumns: (s.footerColumns || []).filter((_, i) => i !== index) }));
  const addFooterLink = (index) => setSettings(s => ({ ...s, footerColumns: (s.footerColumns || []).map((column, i) => i === index ? { ...column, links: [...(column.links || []), { label: '', url: '' }] } : column) }));
  const removeFooterLink = (columnIndex, linkIndex) => setSettings(s => ({ ...s, footerColumns: (s.footerColumns || []).map((column, i) => i === columnIndex ? { ...column, links: (column.links || []).filter((_, j) => j !== linkIndex) } : column) }));
  const setFooterSocial = (index, key, value) => setSettings(s => ({ ...s, footerSocialLinks: (s.footerSocialLinks || []).map((social, i) => i === index ? { ...social, [key]: value } : social) }));
  const addFooterSocial = () => setSettings(s => ({ ...s, footerSocialLinks: [...(s.footerSocialLinks || []), { platform: 'Instagram', url: '' }] }));
  const removeFooterSocial = (index) => setSettings(s => ({ ...s, footerSocialLinks: (s.footerSocialLinks || []).filter((_, i) => i !== index) }));
  const setInstagramPost = (index, key, value) => setSettings(s => ({
    ...s,
    instagramPosts: (s.instagramPosts || []).map((post, i) => i === index ? { ...post, [key]: value } : post),
  }));
  const addInstagramPost = () => setSettings(s => ({
    ...s,
    instagramPosts: [...(s.instagramPosts || []), { url: '', enabled: true }],
  }));
  const removeInstagramPost = (index) => setSettings(s => ({
    ...s,
    instagramPosts: (s.instagramPosts || []).filter((_, i) => i !== index),
  }));

  const renderField = (label, key, type = 'text', placeholder = '') => (
    <div key={key}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{label}</label>
      <input type={type} value={settings[key] || ''} onChange={e => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500" />
    </div>
  );

  const renderLogoUpload = (key, label) => (
    <div className="mt-1">
      <ImageUploadInput
        uploadFn={(files) => uploadAPI.single(files[0]).then(result => result.url)}
        onUploaded={(url) => set(key, url)}
        label={`Upload ${label}`}
      />
      {settings[key] && <img src={settings[key]} alt={`${label} preview`} className="mt-2 h-12 w-auto object-contain rounded border border-gray-200 dark:border-gray-700" />}
    </div>
  );

  const renderBankField = (label, key, placeholder = '') => (
    <div key={key}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{label}</label>
      <input type="text" value={settings.bankDetails?.[key] || ''} onChange={e => setBank(key, e.target.value)}
        placeholder={placeholder} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500" />
    </div>
  );

  const renderToggle = (label, key, description) => (
    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      <button onClick={() => set(key, !settings[key])} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings[key] ? 'bg-gray-900 dark:bg-gray-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings[key] ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <Wrapper title="Website Settings" subtitle="Manage site-wide settings from one place.">
        {/* Pages (Privacy / Terms / FAQ) has its own Publish button */}
        <div className={`mb-6 flex justify-end ${activeTab === 'Pages' ? 'hidden' : ''}`}>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50">
            <FiSave className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 dark:text-gray-500">Loading...</div>
        ) : (
          <div className="flex flex-col gap-4 xl:flex-row xl:gap-6">
            <div className="w-full xl:w-48 xl:shrink-0">
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-sm">
                <div className="flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:gap-1">
                  {visibleTabs.map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors xl:w-full ${activeTab === tab ? 'bg-gray-900 dark:bg-gray-700 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm sm:p-6">
              {activeTab === 'General' && (
                <div className="space-y-4">
                  <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">General Settings</h2>
                  {renderField('Website Name', 'siteName', 'text', 'growthkarts')}
                  {renderField('Legacy / fallback Logo URL', 'logo', 'url', 'https://...')}
                  {renderLogoUpload('logo', 'fallback logo')}
                  {renderField('Light Theme Logo URL', 'lightLogo', 'url', 'https://...')}
                  {renderLogoUpload('lightLogo', 'light logo')}
                  {renderField('Dark Theme Logo URL', 'darkLogo', 'url', 'https://...')}
                  {renderLogoUpload('darkLogo', 'dark logo')}
                  {renderField('Favicon URL', 'favicon', 'url', 'https://...')}
                  {renderField('Contact Email', 'contactEmail', 'email', 'admin@example.com')}
                  {renderField('Contact Phone', 'contactPhone', 'text', '+91 9999999999')}
                  {renderField('WhatsApp Number (floating chat button)', 'whatsappNumber', 'text', '+91 9999999999 — empty = use Contact Phone')}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Business Address</label>
                    <textarea value={settings.address || ''} onChange={e => set('address', e.target.value)} rows={3}
                      className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm" />
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <h3 className="mb-1 text-sm font-bold text-gray-900 dark:text-gray-100">Seller Referral Program</h3>
                    <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                      When a seller refers another seller who signs up with their referral code, the referrer gets a one-time bonus — this % of the new seller's plan price, credited automatically at registration.
                    </p>
                    {renderField('Referral Bonus (%)', 'referralCommissionPercent', 'number', '10')}
                  </div>
                </div>
              )}
              {activeTab === 'Marquee' && (
                <div className="space-y-4">
                  <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Scrolling Marquee</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add up to two messages for the blue bar at the very top of every page. One message per line.
                  </p>
                  <textarea value={marqueeText} onChange={e => setMarqueeText(e.target.value)} rows={8}
                    placeholder={'Free Delivery on orders above ₹999 — Shop more & save more\n🎉 Flat 10% OFF on First Order — Use WELCOME10'}
                    className="w-full resize-y rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 text-sm font-mono" />
                  <p className="text-xs text-gray-400 dark:text-gray-500">{marqueeText.split('\n').filter(l => l.trim()).length} message(s)</p>
                </div>
              )}
              {activeTab === 'Popup' && (() => {
                const popup = { enabled: true, delaySeconds: 4, ...(settings.signupPopup || {}) };
                const field = 'w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500';
                return (
                  <div className="space-y-5">
                    <div>
                      <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">Sign-up Popup</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Shown once to new, logged-out visitors on the website. After someone closes it, it never shows again in that browser.
                      </p>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Show popup</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Turn off to hide it for everyone</p>
                      </div>
                      <button onClick={() => setPopup('enabled', !popup.enabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${popup.enabled ? 'bg-gray-900 dark:bg-gray-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${popup.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <div className="grid lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Heading</label>
                          <input value={popup.title || ''} onChange={e => setPopup('title', e.target.value)} placeholder="Your first purchase, made more rewarding" className={field} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Offer message</label>
                          <textarea value={popup.message || ''} onChange={e => setPopup('message', e.target.value)} rows={3} placeholder="Sign up now and unlock an additional discount of ₹1,000 on your first purchase." className={`${field} resize-none`} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Show after (seconds)</label>
                          <input type="number" min={0} max={120} value={popup.delaySeconds ?? 4} onChange={e => setPopup('delaySeconds', Number(e.target.value))} className={field} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Image — upload or paste URL</label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input value={popup.image || ''} onChange={e => setPopup('image', e.target.value)} placeholder="https://… (empty = default jewellery photo)" className={field} />
                            <ImageUploadInput label="Upload" uploadFn={(files) => uploadAPI.single(files[0]).then(r => r.url)} onUploaded={(url) => setPopup('image', Array.isArray(url) ? url[0] : url)} />
                          </div>
                        </div>
                      </div>
                      {/* Live preview */}
                      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden grid grid-cols-2 bg-white text-center">
                        <img src={popup.image || '/jewelry/earrings.jpg'} alt="" className="w-full h-full object-cover min-h-[260px]" />
                        <div className="p-4 flex flex-col justify-center gap-3">
                          <p className="text-base font-medium text-gray-900 leading-snug">{popup.title || 'Your first purchase, made more rewarding'}</p>
                          <p className="text-xs text-gray-600 bg-[#f7f2ea] rounded-lg p-3">{popup.message || 'Sign up now and unlock member-only offers.'}</p>
                          <span className="py-2 text-xs font-semibold bg-black text-white rounded">Sign Up</span>
                          <span className="py-2 text-xs border border-gray-900 text-gray-900 rounded">Already A Member? Log In</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {activeTab === 'Homepage' && (
                <div className="space-y-8">
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Recommended Collections</h2>
                      <ToggleSwitch
                        checked={settings.homepageSections?.recommendedCollections?.enabled !== false}
                        onChange={(val) => setHomeField('recommendedCollections', 'enabled', val)}
                        label={settings.homepageSections?.recommendedCollections?.enabled !== false ? 'Shown on website' : 'Hidden'}
                      />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      The "Most Recommended Collections" tile grid on the main website homepage. Switch it off to hide the whole section. It's exactly 3 tiles (the first spans two rows) — edit their text, link and image below, then Save.
                    </p>
                    <div className={`space-y-4 ${settings.homepageSections?.recommendedCollections?.enabled === false ? 'opacity-60' : ''}`}>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Badge text</label>
                        <input type="text" value={settings.homepageSections?.recommendedCollections?.badge ?? 'Shop Now'}
                          onChange={e => setHomeField('recommendedCollections', 'badge', e.target.value)}
                          placeholder="Shop Now (leave empty to hide)"
                          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Title</label>
                        <input type="text" value={settings.homepageSections?.recommendedCollections?.title || ''}
                          onChange={e => setHomeField('recommendedCollections', 'title', e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Subtitle</label>
                        <textarea rows={2} value={settings.homepageSections?.recommendedCollections?.subtitle || ''}
                          onChange={e => setHomeField('recommendedCollections', 'subtitle', e.target.value)}
                          className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm" />
                      </div>
                      <div className="space-y-3">
                        {(settings.homepageSections?.recommendedCollections?.items || []).map((item, i) => (
                          <div key={i} className="grid sm:grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                            <p className="sm:col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                              Tile {i + 1}{i === 0 ? ' (big tile)' : ''}
                            </p>
                            <div>
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Label</label>
                              <input type="text" value={item.label || ''} onChange={e => setHomeItem('recommendedCollections', i, 'label', e.target.value)}
                                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Button text</label>
                              <input type="text" value={item.cta || ''} onChange={e => setHomeItem('recommendedCollections', i, 'cta', e.target.value)}
                                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Link</label>
                              <input type="text" value={item.link || ''} onChange={e => setHomeItem('recommendedCollections', i, 'link', e.target.value)}
                                placeholder="/shop" className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Image</label>
                              <input type="url" value={item.img || ''} onChange={e => setHomeItem('recommendedCollections', i, 'img', e.target.value)}
                                placeholder="https://..." className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
                              <div className="mt-2">
                                <ImageUploadInput
                                  uploadFn={(files) => uploadAPI.single(files[0]).then(result => result.url)}
                                  onUploaded={(url) => setHomeItem('recommendedCollections', i, 'img', url)}
                                  label="Upload image"
                                />
                              </div>
                            </div>
                            {item.img && (
                              <img src={item.img} alt={item.label || `Tile ${i + 1}`}
                                className="sm:col-span-2 h-28 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                    <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">Circular Showcase (3D Gallery)</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      The drag/scroll 3D wall of category art. Add, remove, or edit as many tiles as you like.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Title</label>
                        <input type="text" value={settings.homepageSections?.circularShowcase?.title || ''}
                          onChange={e => setHomeField('circularShowcase', 'title', e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Subtitle</label>
                        <textarea rows={2} value={settings.homepageSections?.circularShowcase?.subtitle || ''}
                          onChange={e => setHomeField('circularShowcase', 'subtitle', e.target.value)}
                          className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm" />
                      </div>
                      <div className="space-y-3">
                        {(settings.homepageSections?.circularShowcase?.items || []).map((item, i) => (
                          <div key={i} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 items-end">
                            <div>
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Image URL</label>
                              <input type="url" value={item.image || ''} onChange={e => setHomeItem('circularShowcase', i, 'image', e.target.value)}
                                placeholder="https://..." className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Text</label>
                              <input type="text" value={item.text || ''} onChange={e => setHomeItem('circularShowcase', i, 'text', e.target.value)}
                                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <button type="button" onClick={() => removeHomeItem('circularShowcase', i)}
                              className="h-9 px-3 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => addHomeItem('circularShowcase', { image: '', text: '' })}
                        className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:underline">
                        + Add item
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                    <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">Depth Showcase (Most Popular Sellers)</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      The 3D card stack now shows the most popular sellers (by customer ratings) that reach the shopper's location. Edit the title and subtitle here; the images below are shown only when no seller is available for that location.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Title</label>
                        <input type="text" value={settings.homepageSections?.depthShowcase?.title || ''}
                          onChange={e => setHomeField('depthShowcase', 'title', e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Subtitle</label>
                        <textarea rows={2} value={settings.homepageSections?.depthShowcase?.subtitle || ''}
                          onChange={e => setHomeField('depthShowcase', 'subtitle', e.target.value)}
                          className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm" />
                      </div>
                      <div className="space-y-3">
                        {(settings.homepageSections?.depthShowcase?.items || []).map((item, i) => (
                          <div key={i} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 items-end">
                            <div>
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Image URL</label>
                              <input type="url" value={item.image || ''} onChange={e => setHomeItem('depthShowcase', i, 'image', e.target.value)}
                                placeholder="https://..." className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Alt text</label>
                              <input type="text" value={item.alt || ''} onChange={e => setHomeItem('depthShowcase', i, 'alt', e.target.value)}
                                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <button type="button" onClick={() => removeHomeItem('depthShowcase', i)}
                              className="h-9 px-3 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => addHomeItem('depthShowcase', { image: '', alt: '' })}
                        className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:underline">
                        + Add item
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'Footer' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">Footer Content</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Configure up to three visible columns. Each column can have a heading, subheading and any number of URL links.</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium">About text (under the logo)</label>
                    <textarea rows={3} value={settings.footerDescription || ''} onChange={e => setSettings(p => ({ ...p, footerDescription: e.target.value }))}
                      placeholder="A marketplace for Self-Help Groups and small local businesses..."
                      className="w-full mt-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                  </div>
                  <div className="space-y-4">
                    {(settings.footerColumns || []).map((column, columnIndex) => (
                      <div key={columnIndex} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Column {columnIndex + 1}</p>
                          <button type="button" onClick={() => removeFooterColumn(columnIndex)} className="text-xs text-red-600 flex items-center gap-1"><FiX /> Remove</button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div><label className="text-xs font-medium">Heading</label><input value={column.heading || ''} onChange={e => setFooterColumn(columnIndex, 'heading', e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" placeholder="Shop" /></div>
                          <div><label className="text-xs font-medium">Subheading</label><input value={column.subheading || ''} onChange={e => setFooterColumn(columnIndex, 'subheading', e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" placeholder="Explore our collection" /></div>
                        </div>
                        <div className="mt-3 space-y-2">
                          {(column.links || []).map((link, linkIndex) => (
                            <div key={linkIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                              <div><label className="text-xs font-medium">Link text</label><input value={link.label || ''} onChange={e => setFooterLink(columnIndex, linkIndex, 'label', e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" placeholder="All Products" /></div>
                              <div><label className="text-xs font-medium">URL</label><input value={link.url || ''} onChange={e => setFooterLink(columnIndex, linkIndex, 'url', e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" placeholder="/shop" /></div>
                              <button type="button" onClick={() => removeFooterLink(columnIndex, linkIndex)} className="h-10 px-2 text-red-600"><FiX /></button>
                            </div>
                          ))}
                          <button type="button" onClick={() => addFooterLink(columnIndex)} className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1"><FiPlus /> Add link</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addFooterColumn} className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1"><FiPlus /> Add column</button>

                  <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Social Icons</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Add any number of social profile URLs. Known platforms show their matching icon.</p>
                    <div className="space-y-2">
                      {(settings.footerSocialLinks || []).map((social, index) => (
                        <div key={index} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end">
                          <div><label className="text-xs font-medium">Platform</label><input value={social.platform || ''} onChange={e => setFooterSocial(index, 'platform', e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" placeholder="Instagram" /></div>
                          <div><label className="text-xs font-medium">Profile URL</label><input value={social.url || ''} onChange={e => setFooterSocial(index, 'url', e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" placeholder="https://instagram.com/growthkarts" /></div>
                          <button type="button" onClick={() => removeFooterSocial(index)} className="h-10 px-2 text-red-600"><FiX /></button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={addFooterSocial} className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1"><FiPlus /> Add social profile</button>
                  </div>
                </div>
              )}
              {activeTab === 'Instagram' && isSuperAdmin && (
                <div className="space-y-5">
                  <div>
                    <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">Homepage Instagram Posts</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Add a public Instagram profile, post, or Reel link. Profiles show their Instagram feed; hovering reveals a link to Instagram.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {(settings.instagramPosts || []).map((post, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-end gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
                        <label className="flex-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                          Instagram profile / post / Reel URL
                          <input
                            type="url"
                            value={post.url || ''}
                            onChange={(event) => setInstagramPost(index, 'url', event.target.value)}
                            placeholder="https://www.instagram.com/yourprofile/"
                            className="mt-1 w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <input type="checkbox" checked={post.enabled !== false} onChange={(event) => setInstagramPost(index, 'enabled', event.target.checked)} />
                          Show on homepage
                        </label>
                        <button type="button" onClick={() => removeInstagramPost(index)} aria-label="Remove Instagram post" className="h-10 px-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                          <FiX />
                        </button>
                      </div>
                    ))}
                    {(settings.instagramPosts || []).length === 0 && (
                      <p className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No Instagram posts added yet.
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={addInstagramPost} disabled={(settings.instagramPosts || []).length >= 12}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    <FiPlus /> Add Instagram post
                  </button>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Use public Instagram profile, post, Reel, or IGTV URLs. Maximum 12 links.</p>
                </div>
              )}
              {activeTab === 'Pages' && <LegalPagesEditor />}
              {activeTab === 'Payment' && (
                <div className="space-y-4">
                  <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Payment Settings</h2>
                  {renderToggle('Cash on Delivery (COD)', 'codEnabled', 'Allow customers to pay on delivery')}
                  {renderField('Razorpay Key ID', 'razorpayKeyId', 'text', 'rzp_...')}
                  {renderField('Razorpay Key Secret', 'razorpayKeySecret', 'password', '***')}
                  {renderField('UPI ID', 'upiId', 'text', 'yourname@upi')}

                  <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Seller Plan Payment Details</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Shown to a seller right after they pick a plan on the "Become a Seller" page, so they know where to send the plan fee.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        {renderField('QR Code Image URL', 'qrCode', 'url', 'https://your-qr-image-url.com/qr.png')}
                        {renderLogoUpload('qrCode', 'QR Code')}
                      </div>
                      {renderBankField('Account Holder Name', 'accountHolderName', 'e.g. growthkarts Pvt Ltd')}
                      {renderBankField('Account Number', 'accountNumber', 'e.g. 1234567890123')}
                      {renderBankField('IFSC Code', 'ifscCode', 'e.g. HDFC0001234')}
                      {renderBankField('Bank Name', 'bankName', 'e.g. HDFC Bank, Indore Branch')}
                    </div>
                    {settings.qrCode && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">QR Preview</p>
                        <img src={settings.qrCode} alt="Payment QR" className="w-28 h-28 rounded-lg border border-gray-200 dark:border-gray-700 object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
    </Wrapper>
  );
}