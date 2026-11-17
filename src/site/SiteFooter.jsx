import { Instagram, Mail } from "lucide-react";

export default function SiteFooter({ logoSrc, settings, categories, onSelectCategory, onGoTo }) {
  const year = new Date().getFullYear();
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
