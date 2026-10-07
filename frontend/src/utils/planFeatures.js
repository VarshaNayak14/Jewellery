// Internal plan rules — mirror of backend/src/utils/planCapabilities.js,
// mapped 1:1 to the plan benefits. Configured per plan by the Super Admin and
// enforced by the backend. Internal only — never listed on plan cards (those
// show the plan's own features text).

export const CAPABILITY_DEFAULTS = {
  storefront: true,
  directPayment: true,
  contactButtons: true,
  premiumThemes: true,
  analytics: true,
  videoBanner: true,
  prioritySupport: false,
  businessManager: false,
  videoMaxMinutes: -1,
  searchRanking: 0,
  promoBannersPerYear: 0,
};

export const CAPABILITY_TOGGLES = [
  { key: 'storefront', label: 'Dedicated landing page', hint: 'Seller gets their own public store website.' },
  { key: 'directPayment', label: 'Direct UPI / QR payment', hint: 'Customers can pay the seller directly at checkout.' },
  { key: 'contactButtons', label: 'WhatsApp & Call buttons', hint: 'Phone / WhatsApp shown to customers.' },
  { key: 'premiumThemes', label: 'Premium store themes', hint: 'Minimal, Vibrant, Royal, Boutique & Showcase themes for the store page (Classic is always available).' },
  { key: 'analytics', label: 'Business dashboard & analytics', hint: 'Growth & Analytics page in the seller panel.' },
  { key: 'videoBanner', label: 'Business / brand video banner', hint: 'Seller can use a video as the store banner.' },
  { key: 'prioritySupport', label: 'Dedicated customer support', hint: 'Support tickets marked priority — answered first, within 4 hours.' },
  { key: 'businessManager', label: 'Personal business manager', hint: 'A staff member is assigned to the seller as their direct contact.' },
];

export const SEARCH_RANKING_OPTIONS = [
  { value: 0, label: 'Standard search ranking' },
  { value: 1, label: 'Priority local search' },
  { value: 2, label: 'City-level top ranking' },
  { value: 3, label: 'State-level top ranking' },
];

export const capsOf = (planOrSnapshot) => ({ ...CAPABILITY_DEFAULTS, ...(planOrSnapshot?.capabilities || {}) });
