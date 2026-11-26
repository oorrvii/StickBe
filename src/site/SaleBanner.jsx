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

/** Home page campaign panel. Percent is the live percent, so it always matches the prices. */
export default function SaleBanner({ sale, percent, onShop }) {
  if (!(percent > 0)) return null;
  const ends = saleEndLabel(sale);
  const label = sale && typeof sale.label === "string" ? sale.label.trim() : "";
  return (
    <section className="sb2 sb-salebanner" aria-labelledby="sb-sale-title">
      <div className="sb-salebanner__card">
        <span className="sb-salebanner__shape sb-salebanner__shape--a" aria-hidden="true" />
        <span className="sb-salebanner__shape sb-salebanner__shape--b" aria-hidden="true" />
        <h2 id="sb-sale-title" className="sb-salebanner__big" aria-label={`${label || "Sale"}, ${percent}% off every item`}>
          <span className="sb-accent sb-salebanner__kicker" aria-hidden="true">{label || "Sale"}</span>
          <span className="sb-salebanner__pct" aria-hidden="true">{percent}<small>%</small></span>
          <span className="sb-accent sb-salebanner__off" aria-hidden="true">off</span>
        </h2>
        <div className="sb-salebanner__side">
          <p className="sb-salebanner__line">on every item</p>
          <p className="sb-salebanner__sub">{ends ? `Prices are already reduced. Ends ${ends}.` : "Prices are already reduced."}</p>
          <button type="button" className="sb-btn sb-btn--accent sb-btn--lg" onClick={onShop}>Shop the sale</button>
        </div>
      </div>
    </section>
  );
}
