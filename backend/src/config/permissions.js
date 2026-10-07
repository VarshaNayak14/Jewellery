// Module keys a Super Admin can grant to an Admin staff account. Keep this in
// sync with the Admin Panel's sidebar sections (frontend AdminDashboard.jsx)
// and the `requirePermission(key)` calls in each route file.
const AVAILABLE_PERMISSIONS = [
  'dashboard', 'orders', 'products', 'users', 'sellers',
  'categories', 'returns',
  'reviews', 'notifications', 'reports', 'settings',
  'kyc', 'inventory', 'subscriptions', 'offers', 'support', 'rates', 'blogs',
];

module.exports = { AVAILABLE_PERMISSIONS };