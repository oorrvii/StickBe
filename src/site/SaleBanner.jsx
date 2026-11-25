import { ArrowRight } from "lucide-react";
import { saleEndLabel, saleHeadline } from "./saleLogic.js";

/** Thin strip under the announcement bar. Renders nothing when no sale is running. */
export function SaleStrip({ sale, percent, onShop }) {
  if (!(percent > 0)) return null;
  return (
    <button type="button" className="sb2 sb-salestrip" onClick={onShop}>
      {saleHeadline(sale, percent)} <span aria-hidden="true">·</span> <span className="sb-salestrip__cta">Shop the sale</span>
    </button>
  );
}

/** Full-width banner on the home page. Percent is the live percent, so it always matches the prices. */
export default function SaleBanner({ sale, percent, onShop }) {
  if (!(percent > 0)) return null;
  const ends = saleEndLabel(sale);
  return (
    <section className="sb2 sb-salebanner" aria-labelledby="sb-sale-title">
      <svg className="sb-salebanner__shape sb-salebanner__shape--a" viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,0 61,32 94,22 72,50 94,78 61,68 50,100 39,68 6,78 28,50 6,22 39,32" /></svg>
      <svg className="sb-salebanner__shape sb-salebanner__shape--b" viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,0 61,32 94,22 72,50 94,78 61,68 50,100 39,68 6,78 28,50 6,22 39,32" /></svg>
      <div className="sb-salebanner__inner">
        <p className="sb-salebanner__pill">Sale on now</p>
        <h2 id="sb-sale-title">{saleHeadline(sale, percent)}</h2>
        <p className="sb-salebanner__sub">{ends ? `Ends ${ends}` : "On every item"}</p>
        <button type="button" className="sb-btn sb-btn--dark" onClick={onShop}>Shop the sale <ArrowRight size={18} aria-hidden="true" /></button>
      </div>
    </section>
  );
}
