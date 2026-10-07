import { Link, useLocation } from 'react-router-dom';
import { FiChevronRight, FiHome } from 'react-icons/fi';
import './Breadcrumbs.css';

const LABELS = {
  advertise: 'Advertise',
  nearby: 'Nearby Jewellers',
  search: 'Search',
  'my-account': 'My Account',
  orders: 'Orders',
  tracking: 'Track Order',
  returns: 'Returns',
  wishlist: 'Wishlist',
  addresses: 'Addresses',
  profile: 'Profile',
  business: 'Business',
};

const ROUTES_WITH_OWN_BREADCRUMB = [
  '/shop', '/product/', '/blogs', '/contact', '/faq', '/privacy-policy', '/terms-and-conditions',
];

function routeHasOwnBreadcrumb(pathname) {
  return ROUTES_WITH_OWN_BREADCRUMB.some((path) => (
    path.endsWith('/') ? pathname.startsWith(path) : pathname === path
  ));
}

function titleCase(segment) {
  return LABELS[segment.toLowerCase()]
    || decodeURIComponent(segment).replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  if (pathname === '/' || routeHasOwnBreadcrumb(pathname)) return null;

  const segments = pathname.split('/').filter(Boolean);
  const crumbs = segments.map((segment, index) => ({
    label: titleCase(segment),
    to: `/${segments.slice(0, index + 1).join('/')}`,
  }));

  return (
    <nav className="site-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li><Link to="/" aria-label="Home"><FiHome aria-hidden="true" /><span>Home</span></Link></li>
        {crumbs.map((crumb, index) => (
          <li key={crumb.to}>
            <FiChevronRight className="site-breadcrumbs__separator" aria-hidden="true" />
            {index === crumbs.length - 1
              ? <span aria-current="page">{crumb.label}</span>
              : <Link to={crumb.to}>{crumb.label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
