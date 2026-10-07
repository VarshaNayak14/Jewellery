// Starting content for the footer legal pages — used until an Admin / Super
// Admin edits them (Settings → Pages). Written for this platform's
// model: annual seller subscriptions, direct UPI/QR payments to sellers and
// seller-managed delivery. Have it reviewed by a legal professional before
// relying on it.

const PRIVACY = `Your privacy matters to us. This Privacy Policy explains what information {siteName} collects when you use our website and apps, how we use it, and the choices you have.

## 1. Who we are
{siteName} is a multi-vendor marketplace that helps Self-Help Groups and small businesses sell online through their own dedicated store pages. Customers buy directly from these independent sellers.

## 2. Information we collect
- **Account details** — name, email address, phone number and password when you register as a customer or seller.
- **Order details** — delivery address, items ordered and order history.
- **Payment references** — UPI transaction IDs or payment screenshots you upload as proof of payment. We do **not** store your card or UPI PIN.
- **Seller details** — shop name, business address, KYC documents and bank / UPI details needed to verify the seller and settle payments.
- **Enquiries and messages** — what you send to a seller through contact forms, calls or WhatsApp buttons.
- **Usage data** — device, browser, pages visited and approximate location (only if you allow it) to show nearby shops.

## 3. How we use your information
- To create and manage your account and let you place and track orders.
- To share the details a seller needs to fulfil your order (name, phone, delivery address).
- To show shops and products available in your area.
- To verify sellers, process subscription payments and prevent fraud.
- To send order updates, service messages and, if you agree, offers. You can opt out of promotional messages at any time.
- To improve our platform and fix problems.

## 4. Sharing of information
- **With sellers** — only the details required to complete your order or answer your enquiry.
- **With service providers** — hosting, cloud storage, payment gateways (such as Razorpay), SMS and email providers, only to run our services.
- **For legal reasons** — when required by law, court order or to protect the rights and safety of our users.

We never sell your personal information.

## 5. Payments
Most payments are made directly from you to the seller using the seller's UPI ID or QR code (Google Pay, PhonePe etc.). {siteName} does not hold these funds. Subscription fees paid by sellers online are processed securely by our payment partner.

## 6. Data security
We use industry-standard measures such as encrypted connections (HTTPS) and hashed passwords to protect your data. No online service is 100% secure, so please keep your password private.

## 7. Data retention
We keep your information for as long as your account is active and as needed to meet legal, tax and accounting requirements. Order records may be kept even after an account is closed.

## 8. Your rights
You can view and update your profile at any time. You may ask us to correct or delete your personal data, subject to legal obligations, by writing to {contactEmail}.

## 9. Cookies
We use cookies and local storage to keep you signed in, remember your location and cart, and understand how the site is used. You can clear them from your browser settings.

## 10. Children
Our services are not meant for children under 18. Minors should use the platform only with the involvement of a parent or guardian.

## 11. Changes to this policy
We may update this policy from time to time. The "Last updated" date at the top shows when it last changed.

## 12. Contact us
For any privacy question or request, contact us at **{contactEmail}**, call **{contactPhone}**, or write to {address}.`;

const TERMS = `Welcome to {siteName}. By using our website or apps — as a customer or as a seller — you agree to these Terms & Conditions. Please read them carefully.

## 1. About the platform
{siteName} is an online marketplace that connects customers with independent sellers, including Self-Help Groups and small businesses. Each seller runs their own store page on the platform. Unless clearly stated, {siteName} is not the seller of the products listed.

## 2. Accounts
- You must provide accurate information and keep your login details confidential.
- You are responsible for all activity on your account.
- We may suspend or close accounts that break these terms or are used for fraud.

## 3. For customers
- Product details, prices and availability are provided by the seller.
- Payment is usually made **directly to the seller** through their UPI ID or QR code. Upload a correct payment reference or screenshot when asked.
- Delivery, returns, replacements and refunds are handled by the seller according to the seller's policy. We help resolve disputes through our support team but are not a party to the sale.
- Please check products on delivery and report any problem to the seller and to us promptly.

## 4. For sellers
- Sellers join through an **annual subscription plan** (Basic, Silver, Gold or Platinum). Features, product limits and visibility depend on the plan chosen.
- {siteName} does **not** charge a commission on your sales.
- Subscription fees are payable in advance and are non-refundable once the plan is activated, except where required by law. When you change plans, eligible credit from your last payment is adjusted as shown at checkout.
- When a plan expires, your store and products are hidden until you renew. Your data is kept safe.
- You must complete KYC, sell only genuine and legal products, describe them honestly, honour your prices and deliver orders on time.
- You are fully responsible for packing, shipping, returns, refunds, taxes (including GST where applicable) and any warranty for your products.
- Premium benefits such as the business video banner, priority support and a personal business manager are provided as described in your plan.

## 5. Prohibited use
You must not:
- list or buy illegal, counterfeit, hazardous or restricted items;
- post false, misleading, offensive or infringing content;
- attempt to hack, overload or misuse the platform, or scrape its data;
- harass other users or use their information for any purpose other than the transaction.

## 6. Content and intellectual property
The {siteName} name, logo and platform design belong to us. Sellers keep ownership of their product photos and content, and allow us to display them on the platform and in promotions. Videos produced by our team for a seller may be used by that seller for their own marketing.

## 7. Reviews
Reviews must be honest and based on genuine experience. We may remove reviews that are abusive, fake or irrelevant.

## 8. Limitation of liability
The platform is provided "as is". To the extent permitted by law, {siteName} is not liable for any loss arising from transactions between customers and sellers, product quality, delivery delays or payments made directly to sellers.

## 9. Suspension and termination
We may suspend or remove any account, store or listing that breaks these terms, with or without notice.

## 10. Changes
We may update these terms from time to time. Continued use of the platform after changes means you accept the updated terms.

## 11. Governing law
These terms are governed by the laws of India. Courts in Maharashtra shall have jurisdiction over any dispute.

## 12. Contact us
Questions about these terms? Email **{contactEmail}**, call **{contactPhone}**, or write to {address}.`;

const faq = (category, list) => list.map(([question, answer]) => ({ category, question, answer }));

const FAQ_ITEMS = [
  ...faq('Shopping & Orders', [
    ['What is {siteName}?', '{siteName} is an online marketplace where Self-Help Groups and small local businesses sell their products directly to you. Every seller has their own store page, so you buy straight from the maker.'],
    ['How do I place an order?', 'Open a product, choose size / colour if needed and tap **Add to Cart**. Go to your cart, enter your delivery address and complete the payment. You can see the order anytime under **My Account → Orders**.'],
    ['Do I need an account to buy?', 'Yes, a free account is needed to place and track orders. You can still browse shops and products without logging in.'],
    ['How do I track my order?', 'Go to **My Account → Orders** and open the order to see its latest status and tracking details shared by the seller.'],
    ['Can I cancel my order?', 'You can ask for cancellation before the seller ships the order. Contact the seller from the order page, or reach our support team if you need help.'],
    ['How do I find shops near me?', 'Open **Nearby Businesses**, then pick your state / district / tehsil, tap **Use my current location**, or enter your 6-digit **PIN code** to see shops in your area.'],
  ]),
  ...faq('Payments', [
    ['How do I pay for my order?', 'Most sellers accept payment **directly to their UPI ID or QR code** using Google Pay, PhonePe, Paytm or any UPI app. Some orders can also be paid online at checkout.'],
    ['Why do I need to upload a payment screenshot?', 'When you pay a seller directly by UPI, the transaction ID or screenshot helps the seller confirm your payment quickly and start processing your order.'],
    ['Is it safe to pay the seller directly?', 'Yes. Only pay the UPI ID / QR code shown on the checkout page for that seller. Never share your UPI PIN or account password with anyone — neither sellers nor our team will ever ask for them.'],
    ['Does {siteName} charge any extra fee?', 'No. We do not add any commission or convenience fee to your order. You pay the price set by the seller (plus delivery charges, if the seller has any).'],
  ]),
  ...faq('Delivery, Returns & Refunds', [
    ['Who delivers my order?', 'Each seller packs and ships their own orders through local post or a courier partner. Delivery time depends on the seller and your location.'],
    ['How do I return or exchange a product?', 'Open the order under **My Account → Orders** and request a return if the product is damaged, wrong or not as described. The seller will review it as per their return policy.'],
    ['When will I get my refund?', 'Once the seller approves the return and receives the product, the refund is sent back to you — usually to your original payment method or wallet. If there is a delay, contact our support team.'],
    ['What if I receive a damaged or wrong product?', 'Take photos or a short video when you open the package and raise a return / complaint from the order page within the return window. We will help you resolve it with the seller.'],
  ]),
  ...faq('For Sellers', [
    ['How can I sell on {siteName}?', 'Tap **Become a Seller**, choose a subscription plan, fill in your shop details and pay the plan fee. After admin approval and KYC, you can start adding products.'],
    ['What are the subscription plans?', 'We offer four annual plans:\n\n- **Basic — ₹1,999/year:** up to 50 products, your own store page, UPI/QR payments, WhatsApp & Call buttons.\n- **Silver — ₹4,999/year:** up to 200 products, premium store design, priority pincode search, analytics, 1 promo banner.\n- **Gold — ₹9,999/year:** up to 500 products, business video banner, city-level top ranking, dedicated support.\n- **Platinum — ₹19,999/year:** unlimited products, premium brand video banner, state-level top ranking, personal business manager.'],
    ['Do you take a commission on my sales?', 'No. You pay only the yearly subscription fee. **0% commission** — customers pay you directly through your own UPI ID / QR code.'],
    ['Can I upgrade or change my plan later?', 'Yes. Go to **Seller Panel → My Plan** and pick a new plan. Credit from your last payment is adjusted automatically, and you can pay online or by bank / UPI transfer — no need to register again.'],
    ['What happens when my plan expires?', 'Your store and products are hidden from customers until you renew. All your products, orders and settings stay safe. Just log in and renew from **My Plan**.'],
  ]),
  ...faq('Account & Support', [
    ['I forgot my password. What should I do?', 'Contact our support team at **{contactEmail}** from your registered email address and we will help you reset it. If you are logged in, you can change your password anytime from your profile.'],
    ['How is my personal information used?', 'We only use your details to run your account and orders, and share with a seller just what they need to deliver your order. Read our **Privacy Policy** for full details.'],
    ['How do I contact customer support?', 'Email us at **{contactEmail}** or call **{contactPhone}**. Sellers can also raise a ticket from **Seller Panel → Help & Support**.'],
  ]),
];

const LEGAL_DEFAULTS = {
  'privacy-policy': {
    title: 'Privacy Policy',
    summary: 'How we collect, use and protect your personal information.',
    content: PRIVACY,
  },
  'terms-and-conditions': {
    title: 'Terms & Conditions',
    summary: 'The rules for using our marketplace as a customer or a seller.',
    content: TERMS,
  },
  faq: {
    title: 'Frequently Asked Questions',
    summary: 'Quick answers about shopping, payments, delivery and selling on our marketplace.',
    content: '',
    items: FAQ_ITEMS,
  },
};

// Puts the default content into the database. Pages that already exist are
// left alone (so admin edits are kept) unless `force` is true.
const seedLegalPages = async ({ force = false } = {}) => {
  const LegalPage = require('../models/LegalPage');
  const result = [];
  for (const [slug, data] of Object.entries(LEGAL_DEFAULTS)) {
    const exists = await LegalPage.exists({ slug });
    if (exists && !force) { result.push({ page: slug, action: 'kept (already exists)' }); continue; }
    await LegalPage.findOneAndUpdate({ slug }, { slug, ...data, items: data.items || [] }, { upsert: true, runValidators: true });
    result.push({ page: slug, action: exists ? 'overwritten with default' : 'created' });
  }
  return result;
};

module.exports = { LEGAL_DEFAULTS, seedLegalPages };

// ── Website footer ──────────────────────────────────────────────────────────
const FOOTER_DEFAULTS = {
  footerDescription: 'A marketplace for Self-Help Groups and small local businesses. Discover handmade, homemade and locally made products — and buy directly from the people who make them, with zero commission.',
  footerColumns: [
    {
      heading: 'Shop', subheading: 'Explore the marketplace',
      links: [
        { label: 'All Products', url: '/shop' },
        { label: 'Flash Sale', url: '/shop?isFlashSale=true' },
        { label: 'Nearby Businesses', url: '/nearby' },
        { label: 'Handmade Decorative', url: '/shop/handmade-decorative' },
        { label: 'Food & Spices', url: '/shop/food-spices' },
        { label: 'Jewellery', url: '/shop/jwellery' },
      ],
    },
    {
      heading: 'Customer Care', subheading: 'We are here to help',
      links: [
        { label: 'My Account', url: '/my-account' },
        { label: 'Track Your Order', url: '/my-account/tracking' },
        { label: 'Return & Exchange', url: '/my-account/returns' },
        { label: 'FAQ', url: '/faq' },
        { label: 'Privacy Policy', url: '/privacy-policy' },
        { label: 'Terms & Conditions', url: '/terms-and-conditions' },
      ],
    },
    {
      heading: 'Sell With Us', subheading: 'Grow your business online',
      links: [
        { label: 'Become a Seller', url: '/seller/register' },
        { label: 'Seller Login', url: '/seller/login' },
      ],
    },
  ],
};

// Fills the footer in Site Settings. Only replaces the columns when they are
// (nearly) empty — fewer than 4 links in total — and the description when it
// is blank, so a footer the admin has built is kept. `force` overwrites both.
const seedFooter = async ({ force = false } = {}) => {
  const SiteSettings = require('../models/SiteSettings');
  let settings = await SiteSettings.findOne();
  if (!settings) settings = await SiteSettings.create({});
  const linkCount = (settings.footerColumns || []).reduce((n, c) => n + (c.links?.length || 0), 0);
  const result = [];
  if (force || linkCount < 4) {
    settings.footerColumns = FOOTER_DEFAULTS.footerColumns;
    result.push({ page: 'footer links', action: `set (${FOOTER_DEFAULTS.footerColumns.reduce((n, c) => n + c.links.length, 0)} links)` });
  } else result.push({ page: 'footer links', action: 'kept (already filled)' });
  if (force || !settings.footerDescription) {
    settings.footerDescription = FOOTER_DEFAULTS.footerDescription;
    result.push({ page: 'footer description', action: 'set' });
  } else result.push({ page: 'footer description', action: 'kept' });
  await settings.save();
  return result;
};

module.exports.FOOTER_DEFAULTS = FOOTER_DEFAULTS;
module.exports.seedFooter = seedFooter;
