import { useEffect, useState } from 'react';
import { productAPI, categoryAPI } from '../services/api';
import { getSavedLocation, onLocationChange } from '../utils/location';
import { getEffectiveProductPrice } from '../utils/helpers';

// One shared request per location, reused by every home section (no duplicate API calls).
const productCache = new Map();
let categoryPromise = null;

export const getProductImage = (p) =>
  p?.images?.[0] || p?.variants?.find((v) => v.images?.length)?.images?.[0] || '';

export const getProductPrice = (p) => Number(getEffectiveProductPrice(p)) || 0;

const normalizeCategory = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

export function getProductForCollection(products, collection) {
  const category = normalizeCategory(collection.slug || collection.category || collection.name);
  const subCategory = normalizeCategory(collection.sub || collection.subCategory);
  return products.find((product) => (
    getProductImage(product) &&
    normalizeCategory(product.category) === category &&
    (!subCategory || normalizeCategory(product.subCategory) === subCategory)
  ));
}

export const prettyCategory = (slug = '') =>
  String(slug).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function useHomeProducts(limit = 40) {
  const [location, setLocation] = useState(() => getSavedLocation());
  useEffect(() => onLocationChange(setLocation), []);
  const [state, setState] = useState({ products: [], loading: true });

  const st = location?.state || '';
  const di = location?.district || '';
  const te = location?.tehsil || '';

  useEffect(() => {
    let alive = true;
    const key = `${limit}|${st}|${di}|${te}`;
    if (!productCache.has(key)) {
      productCache.set(
        key,
        productAPI.getAll({ limit, sort: '-createdAt', state: st, district: di, tehsil: te })
          .then((d) => d.products || [])
          .catch(() => { productCache.delete(key); return []; })
      );
    }
    productCache.get(key).then((products) => { if (alive) setState({ products, loading: false }); });
    return () => { alive = false; };
  }, [limit, st, di, te]);

  return state;
}

// Turns categories into shop-able "collections": every subcategory that has a photo
// (Category.typeImages) becomes its own card; a category without subcategories is a card itself.
// -> [{ name, slug, sub, image, description, link }]
function toCollections(categories) {
  const out = [];
  categories.forEach((c) => {
    const images = c.typeImages && !Array.isArray(c.typeImages) ? c.typeImages : {};
    const subs = (c.types || []).filter((t) => images[t]);
    if (subs.length) {
      subs.forEach((t) => out.push({
        name: t, slug: c.slug, sub: t, image: images[t], description: c.name,
        link: `/shop/${c.slug}?subCategory=${encodeURIComponent(t)}`,
      }));
    } else if (c.image) {
      out.push({ name: c.name, slug: c.slug, sub: '', image: c.image, description: '', link: `/shop/${c.slug}` });
    }
  });
  return out;
}

// Preferred card order for the home page (first 2 become the big cards). Others follow.
const COLLECTION_ORDER = ['rings', 'earrings', 'pendants', 'necklaces', 'bracelets', 'mangalsutra'];
const rank = (c) => {
  const i = COLLECTION_ORDER.indexOf(String(c.name).toLowerCase());
  return i === -1 ? 99 : i;
};

export function useHomeCategories() {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    let alive = true;
    if (!categoryPromise) {
      categoryPromise = categoryAPI.getAll()
        .then((d) => toCollections((d.categories || []).filter((c) => c.isActive !== false)))
        .catch(() => { categoryPromise = null; return []; });
    }
    categoryPromise.then((c) => { if (alive) setCategories([...c].sort((a, b) => rank(a) - rank(b))); });
    return () => { alive = false; };
  }, []);
  return categories;
}