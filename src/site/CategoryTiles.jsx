import { ArrowUpRight } from "lucide-react";
import { Skeleton } from "../ui/index.js";
import FitImage from "./FitImage.jsx";
import { categoryCover } from "./heroPhotos.js";
import { mosaicSpans } from "./categoryLayout.js";

export default function CategoryTiles({ categories, loading, onSelect }) {
  const visible = categories.filter((cat) => cat.showOnHome !== false && (loading || cat.items.length > 0));
  const spans = mosaicSpans(visible.length);

  return (
    <section id="categories" className="sb2 sb-cats" aria-labelledby="sb-cats-title">
      <div className="sb-section-head">
        <p className="sb-eyebrow">Browse</p>
        <h2 id="sb-cats-title">Shop by <span className="sb-accent">category</span></h2>
      </div>
      <div className="sb-cats__grid">
        {visible.map((cat, i) => {
          const cover = cat.image || categoryCover(cat);
          return (
            <button key={cat.id} type="button" className="sb-cat" data-i={i % 5} style={{ "--span": spans[i] }} onClick={() => onSelect(cat.id)}>
              <span className="sb-cat__text">
                <span className="sb-cat__label">{cat.label}</span>
                {cat.items.length > 0 && <span className="sb-cat__count">{cat.items.length} items</span>}
              </span>
              <span className="sb-cat__go" aria-hidden="true"><ArrowUpRight size={18} /></span>
              <span className="sb-cat__img">
                {cover ? <FitImage src={cover} /> : loading ? <Skeleton width="100%" height="100%" style={{ borderRadius: 0 }} /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
