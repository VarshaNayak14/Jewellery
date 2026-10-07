import { FiArrowRight } from 'react-icons/fi';
import './HomeBannerCarousel.css';
import './HomeExtraSections.css';
import './OfferHomepagePreview.css';

export default function OfferHomepagePreview({ offer = {}, placement = 'homepage' }) {
  if (placement === 'festival') {
    return (
      <div className="hx-fest-grid is-1 hx-fest-preview-grid">
        <div className="hx-fest-cell">
          <div className="hx-fest-card">
            {offer.image && <img src={offer.image} alt="" />}
            <span className="hx-fest-shade" />
            {offer.discountText && <span className="hx-fest-badge">{offer.discountText}</span>}
            <span className="hx-fest-body">
              {offer.tag && <small>{offer.tag}</small>}
              {offer.title && <strong>{offer.title}</strong>}
              {offer.description && <span className="hx-fest-desc">{offer.description}</span>}
              <span className="hx-fest-cta">Shop the offer <FiArrowRight aria-hidden="true" /></span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-banner home-banner-preview">
      <div className="home-banner__stage">
        <div className="home-banner__slide is-active">
          {offer.image && <img src={offer.image} alt="" />}
        </div>
      </div>
    </div>
  );
}
