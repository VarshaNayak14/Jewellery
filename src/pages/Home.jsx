import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowRight,
  FiCheck,
  FiChevronRight,
  FiGift,
  FiPackage,
  FiShield,
  FiTruck,
} from 'react-icons/fi';
import { getProductForCollection, getProductImage, useHomeCategories, useHomeProducts } from '../hooks/useHomeData';
import { formatPrice, getEffectiveOriginalPrice, getEffectiveProductPrice } from '../utils/helpers';
import './Home.css';

import VideoHero from '../components/home/VideoHero';
import HomeBannerCarousel from '../components/home/HomeBannerCarousel';
import HomeExtraSections from '../components/home/HomeExtraSections';
import TopCategoriesMarquee from '../components/home/TopCategoriesMarquee';
import CuratedCollections from '../components/home/CuratedCollections';
import JewelleryGallery from '../components/home/JewelleryGallery';
import StoreLocator from '../components/home/StoreLocator';
import ProductTestimonials from '../components/home/ProductTestimonials';

function SectionHeading({ eyebrow, title, note, link = '/shop', linkText = 'Explore the collection' }) {
  return (
    <div className="jewel-section-heading">
      <div>
        <span className="jewel-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      <Link className="jewel-text-link" to={link}>
        {linkText}<FiArrowRight aria-hidden="true" />
      </Link>
    </div>
  );
}

function ProductTile({ product, index }) {
  const image = product.images?.[0] || product.variants?.find(variant => variant.images?.length)?.images?.[0];
  const price = getEffectiveProductPrice(product);
  const listedPrice = getEffectiveOriginalPrice(product);
  const originalPrice = listedPrice ?? (product.isFlashSale && price < Number(product.price) ? Number(product.price) : null);

  return (
    <motion.article
      className="jewel-product-tile"
      initial={{ opacity: 0, y: 28, rotateY: -8 }}
      whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.65, delay: index * 0.08, ease: [0.2, 0.7, 0.2, 1] }}
      whileHover={{ y: -8, rotateX: 2 }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <Link to={`/product/${product._id}`} className="jewel-product-image">
        {image
          ? <img src={image} alt={product.name} loading="lazy" />
          : <span className="jewel-product-placeholder">AURELLE</span>}
        <span className="jewel-product-view">View piece <FiArrowRight aria-hidden="true" /></span>
      </Link>
      <div className="jewel-product-copy">
        <span>{product.brand || 'Aurelle Fine Jewellery'}</span>
        <h3><Link to={`/product/${product._id}`}>{product.name}</Link></h3>
        {product.ratings > 0 && (
          <div className="jewel-rating" aria-label={`Rated ${product.ratings} out of 5`}>
            <span aria-hidden="true">★★★★★</span>
            <small>{Number(product.ratings).toFixed(1)}</small>
          </div>
        )}
        <p className="jewel-product-prices">
          <strong>{formatPrice(price)}</strong>
          {originalPrice > price && <del>{formatPrice(originalPrice)}</del>}
        </p>
      </div>
    </motion.article>
  );
}

function TrustNote({ icon: Icon, title, detail }) {
  return (
    <div className="jewel-trust-note">
      <span className="jewel-trust-icon"><Icon aria-hidden="true" /></span>
      <div><strong>{title}</strong><span>{detail}</span></div>
    </div>
  );
}

export default function Home() {
  const { products } = useHomeProducts(100);
  const productsWithImages = products.filter((product) => getProductImage(product));
  const categories = useHomeCategories();
  const collections = categories
    .slice(6, 10) // the first 6 are shown in "Our Collections"
    .map((category) => {
      const product = getProductForCollection(productsWithImages, category);
      return product ? {
        ...category,
        title: category.name,
        detail: category.description || 'Explore the collection',
        image: getProductImage(product),
      } : null;
    })
    .filter(Boolean);

  return (
    <main className="jewel-home">
      <VideoHero />

      <TopCategoriesMarquee />

      

      {collections.length > 0 && (
      <section className="jewel-collections" id="the-collection">
        <div className="jewel-page-width">
          <SectionHeading
            eyebrow="The collection"
            title={<>Your everyday, <em>reimagined.</em></>}
            note="A few well-loved forms. A hundred ways to make them yours."
          />
          <div className="jewel-collection-grid">
            {collections.map((collection, index) => (
              <motion.div
                className={`jewel-collection-card jewel-collection-card-${index + 1}`}
                key={collection.title}
                initial={{ opacity: 0, y: 30, rotateY: index % 2 ? 8 : -8 }}
                whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.7, delay: index * 0.08 }}
                whileHover={{ y: -8 }}
              >
                <Link to={collection.link} aria-label={`Explore ${collection.title}`}>
                  <img src={collection.image} alt="" loading="lazy" style={{ objectPosition: collection.position }} />
                  <span className="jewel-collection-index">0{index + 1}</span>
                  <span className="jewel-collection-shade" />
                  <span className="jewel-collection-label">
                    <small>{collection.detail}</small>
                    <strong>{collection.title}</strong>
                    <i><FiArrowRight aria-hidden="true" /></i>
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      <HomeBannerCarousel />


      
      <CuratedCollections />

      {productsWithImages.length > 0 && (
        <section className="jewel-new-arrivals">
          <div className="jewel-page-width">
            <SectionHeading
              eyebrow="Just arrived"
              title={<>A fresh <em>point of view.</em></>}
              note="Meet the pieces we're wearing on repeat."
              linkText="View everything"
            />
            <div className="jewel-product-grid">
              {productsWithImages.slice(0, 4).map((product, index) => (
                <ProductTile key={product._id} product={product} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      <JewelleryGallery />

      <HomeExtraSections />

      <StoreLocator />

      <ProductTestimonials />

     
    </main>
  );
}