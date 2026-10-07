import { useState, useEffect } from 'react';
import { HeroParallax } from '../ui/hero-parallax';
import { productAPI } from '../../services/api';
import { getSavedLocation, onLocationChange } from '../../utils/location';

// Real top-rated products (admin + seller catalog) driving the scroll-3D
// wall — sorted by rating first, falling back to newest so the section
// still looks full before any reviews exist yet. Clicking a card goes
// straight to that product's page (the seller's own listing, if it's a
// seller product), not just a generic category link.
export default function ParallaxShowcase() {
  const [products, setProducts] = useState([]);
  const [location, setLocation] = useState(() => getSavedLocation());

  useEffect(() => onLocationChange(setLocation), []);

  useEffect(() => {
    productAPI.getAll({
      sort: '-ratings -numReviews -createdAt',
      limit: 15,
      state: location?.state || '',
      district: location?.district || '',
      tehsil: location?.tehsil || '',
    })
      .then(data => {
        const mapped = (data.products || [])
          .filter(p => p.images?.[0])
          .map(p => ({ title: p.name, link: `/product/${p._id}`, thumbnail: p.images[0] }));
        setProducts(mapped);
      })
      .catch(() => {});
  }, [location]);

  if (products.length === 0) return null;

  return (
    <HeroParallax
      products={products}
      heading="Everything You Love, In One Marketplace"
      subheading="From fashion to electronics — thousands of products from trusted local sellers, all in one place. Scroll to explore."
    />
  );
}
