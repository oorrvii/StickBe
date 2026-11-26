import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import ProductTile from "../shop/ProductTile.jsx";
import { isAvailable } from "./heroPhotos.js";

const MAX_FEATURED = 8;

/** Products marked "Feature on home page" in the admin. Renders nothing when none are marked. */
export default function FeaturedRow({ categories, discountPercent, wishlist, cart, onToggleWishlist, onSeeAll }) {
  const items = useMemo(
    () => categories
      .flatMap((c) => c.items.map((i) => ({ ...i, categoryLabel: c.label, categoryId: c.id })))
      .filter((i) => i.featured === true && i.slug && isAvailable(i))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.slug.localeCompare(b.slug))
      .slice(0, MAX_FEATURED),
    [categories]
  );
  if (items.length === 0) return null;

  const qtyOf = (item) => cart.filter((c) => c.name === item.name || c.name.startsWith(`${item.name} (`)).reduce((n, c) => n + c.qty, 0);
  const open = (item) => {
    // The shop section below owns the product popup; it listens for the browser's back/forward event.
    window.history.pushState({}, "", `/product/${encodeURIComponent(item.slug)}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <section id="featured" className="sb2 sb-feat" aria-labelledby="sb-feat-title">
      <div className="sb-feat__head">
        <div>
          <p className="sb-eyebrow">Right now</p>
          <h2 id="sb-feat-title">Featured <span className="sb-accent">picks</span></h2>
        </div>
        <button type="button" className="sb-btn sb-btn--secondary" onClick={onSeeAll}>Shop everything <ArrowRight size={16} aria-hidden="true" /></button>
      </div>
      <div className="sb-grid">
        {items.map((item) => (
          <ProductTile key={item.slug} item={item} discountPercent={discountPercent} inWishlist={wishlist.includes(item.name)}
            onToggleWishlist={onToggleWishlist} cartQty={qtyOf(item)} onOpen={open} />
        ))}
      </div>
    </section>
  );
}
