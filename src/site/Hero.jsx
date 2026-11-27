import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "../ui/index.js";
import FitImage from "./FitImage.jsx";
import { pickHeroProducts, itemImage } from "./heroPhotos.js";
import { splitAccent } from "./accentText.js";


export default function Hero({ settings, categories, loading, onShop, onBrowse, saleLabel }) {
  const photos = useMemo(() => pickHeroProducts(categories, { count: 4, windowDays: 2 }), [categories]);

  return (
    <section className="sb2 sb-hero" aria-labelledby="sb-hero-title">
      <div className="sb-hero__inner">
        <div className="sb-hero__copy">
          <p className="sb-eyebrow">{settings.heroEyebrow}</p>
          <h1 id="sb-hero-title">
            {splitAccent(settings.heroTitle).map((p, i) =>
              p.accent ? <span key={i} className="sb-accent">{p.text}</span> : <span key={i}>{p.text}</span>
            )}
          </h1>
          <p className="sb-hero__sub">{settings.heroSubtitle}</p>
          {saleLabel && <p className="sb-hero__sale">{saleLabel}</p>}
          <div className="sb-hero__cta">
            <button type="button" className="sb-btn sb-btn--primary sb-btn--lg" onClick={onShop}>
              Shop the collection <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button type="button" className="sb-btn sb-btn--secondary sb-btn--lg" onClick={onBrowse}>
              Browse categories
            </button>
          </div>
        </div>

        <div className="sb-hero__collage" aria-label="Featured products">
          <span className="sb-hero__blob sb-hero__blob--a" aria-hidden="true" />
          <span className="sb-hero__blob sb-hero__blob--b" aria-hidden="true" />
          {photos.length >= 2
            ? photos.map((item, i) => (
                <a key={item.slug} className={`sb-hero__tile sb-hero__tile--${i + 1}`} href={`/product/${item.slug}`}>
                  <span className="sb-hero__img">
                    <FitImage src={itemImage(item)} alt={item.name} loading="eager" />
                  </span>
                  <span className="sb-hero__label">{item.categoryLabel}</span>
                </a>
              ))
            : [1, 2, 3, 4].map((i) => (
                <div key={i} className={`sb-hero__tile sb-hero__tile--${i} sb-hero__tile--empty`}>
                  {loading && <Skeleton width="100%" height="100%" style={{ borderRadius: 0 }} />}
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
