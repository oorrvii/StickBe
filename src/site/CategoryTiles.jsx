import { Skeleton } from "../ui/index.js";
import FitImage from "./FitImage.jsx";
import { categoryCover } from "./heroPhotos.js";

export default function CategoryTiles({ categories, loading, onSelect }) {
  const visible = categories.filter((cat) => loading || cat.items.length > 0);

  return (
    <section id="categories" className="sb2 sb-cats" aria-labelledby="sb-cats-title">
      <div className="sb-section-head">
        <p className="sb-eyebrow">Browse</p>
        <h2 id="sb-cats-title">Shop by category</h2>
      </div>
      <div className="sb-cats__grid">
        {visible.map((cat) => {
          const cover = categoryCover(cat);
          return (
            <button key={cat.id} type="button" className="sb-cat" onClick={() => onSelect(cat.id)}>
              <span className="sb-cat__img">
                {cover ? (
                  <FitImage src={cover} />
                ) : loading ? (
                  <Skeleton width="100%" height="100%" style={{ borderRadius: 0 }} />
                ) : null}
              </span>
              <span className="sb-cat__label">{cat.label}</span>
              {cat.items.length > 0 && <span className="sb-cat__count">{cat.items.length} items</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
