import { Hand, PackageCheck, Boxes, Wallet, Truck } from "lucide-react";

const ICONS = [Hand, PackageCheck, Boxes, Wallet, Truck];

export default function TrustStrip({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="sb2 sb-trust" aria-label="Why shop with us">
      <ul className="sb-trust__list">
        {items.map((item, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <li key={`${item.title}-${i}`} className="sb-trust__item">
              <span className="sb-trust__icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <div>
                <p className="sb-trust__title">{item.title}</p>
                {item.text && <p className="sb-trust__text">{item.text}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
