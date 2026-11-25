import { Instagram, Mail, Phone, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { usePublishedPages } from "./usePublishedPages.js";

export default function SiteFooter({ logoSrc, settings, categories, onSelectCategory, onGoTo }) {
  const year = new Date().getFullYear();
  const pages = usePublishedPages();
  const shopCategories = categories.filter((c) => c.items.length > 0);

  return (
    <footer className="sb2 sb-footer">
      <div className="sb-footer__inner">
        <div className="sb-footer__brand">
          <div className="sb-footer__logo">
            {logoSrc && <img src={logoSrc} alt="" width="40" height="40" />}
            <span>StickBe</span>
          </div>
          <p className="sb-accent">{settings.footerTagline}</p>
        </div>

        <nav className="sb-footer__col sb-footer__col--shop" aria-label="Shop categories">
          <h3>Shop</h3>
          <ul>
            {shopCategories.map((cat) => (
              <li key={cat.id}>
                <button type="button" onClick={() => onSelectCategory(cat.id)}>
                  {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="sb-footer__col" aria-label="Help">
          <h3>Help</h3>
          <ul>
            <li>
              <button type="button" onClick={() => onGoTo("story")}>Our story</button>
            </li>
            <li>
              <button type="button" onClick={() => onGoTo("feedback")}>Feedback & questions</button>
            </li>
            {pages.map((p) => (
              <li key={p.slug}><Link to={`/${p.slug}`}>{p.title}</Link></li>
            ))}
          </ul>
        </nav>

        <div className="sb-footer__col">
          <h3>Connect</h3>
          <ul>
            <li>
              <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">
                <Instagram size={16} aria-hidden="true" /> @{settings.instagramHandle}
              </a>
            </li>
            {settings.phone && (
              <li>
                <a href={`tel:+91${settings.phone}`}><Phone size={16} aria-hidden="true" /> {settings.phone}</a>
              </li>
            )}
            {settings.whatsapp && (
              <li>
                <a href={`https://wa.me/91${settings.whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden="true" /> WhatsApp</a>
              </li>
            )}
            <li>
              <a href={`mailto:${settings.contactEmail}`}>
                <Mail size={16} aria-hidden="true" /> {settings.contactEmail}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className="sb-footer__legal">© {year} StickBe. All rights reserved.</p>
    </footer>
  );
}
