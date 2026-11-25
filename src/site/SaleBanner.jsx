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

/** Home page banner. Percent is the live percent, so it always matches the prices. */
export default function SaleBanner({ sale, percent, onShop }) {
  if (!(percent > 0)) return null;
  const ends = saleEndLabel(sale);
  const label = sale && typeof sale.label === "string" ? sale.label.trim() : "";
  return (
    <section className="sb2 sb-salebanner" aria-labelledby="sb-sale-title">
      <div className="sb-salebanner__card">
        <div>
          <p className="sb-accent sb-salebanner__eyebrow">Sale on now</p>
          <h2 id="sb-sale-title">{label || "Sale"}: {percent}% off every item</h2>
          <p className="sb-salebanner__sub">{ends ? `Prices are already reduced. Ends ${ends}.` : "Prices are already reduced."}</p>
          <button type="button" className="sb-btn sb-btn--primary sb-btn--lg" onClick={onShop}>Shop the sale</button>
        </div>
        <div className="sb-salebanner__badge" aria-hidden="true">
          <span className="sb-salebanner__pct">{percent}%</span>
          <span className="sb-salebanner__off">OFF</span>
        </div>
      </div>
    </section>
  );
}
