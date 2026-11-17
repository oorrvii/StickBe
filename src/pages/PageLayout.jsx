import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SiteHeader, AnnouncementBar, SiteFooter, useSiteSettings } from "../site/index.js";
import { AccountIcon } from "../CustomerAuth.jsx";
import { useAccount } from "../app/AccountContext.jsx";
import { useCatalog } from "../shop/CatalogContext.jsx";
import "./pages.css";

const MOBILE_LINKS = [
  { id: "shop", label: "Shop" },
  { id: "story", label: "Our story" },
  { id: "gallery", label: "Moments" },
  { id: "feedback", label: "Contact" },
];

export default function PageLayout({ logoSrc }) {
  const { cart, wishlist, user } = useAccount();
  const { categories } = useCatalog();
  const settings = useSiteSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const goTo = (id) => {
    setMenuOpen(false);
    navigate(`/#${id}`);
  };
  const cartCount = cart.reduce((n, i) => n + i.qty, 0);

  return (
    <div className="sb2 sb-pagewrap">
      <AnnouncementBar text={settings.announcement} />
      <SiteHeader
        logoSrc={logoSrc}
        accountSlot={<AccountIcon user={user} onOpenAuth={() => navigate("/sign-in")} onOpenAccount={() => navigate("/account")} />}
        wishlistCount={wishlist.length}
        cartCount={cartCount}
        onOpenMenu={() => setMenuOpen((o) => !o)}
        onOpenWishlist={() => navigate("/wishlist")}
        onOpenCart={() => navigate("/cart")}
        onGoTo={goTo}
      />
      {menuOpen && (
        <nav className="sb-mobilenav" aria-label="Menu">
          {MOBILE_LINKS.map((l) => (
            <button key={l.id} type="button" onClick={() => goTo(l.id)}>{l.label}</button>
          ))}
          <button type="button" onClick={() => { setMenuOpen(false); navigate("/wishlist"); }}>Wishlist</button>
          <button type="button" onClick={() => { setMenuOpen(false); navigate(user ? "/account" : "/sign-in"); }}>{user ? "My account" : "Log in"}</button>
        </nav>
      )}
      <main className="sb-pagemain">
        <Outlet />
      </main>
      <SiteFooter
        logoSrc={logoSrc}
        settings={settings}
        categories={categories}
        onSelectCategory={(id) => navigate(`/?category=${id}#shop`)}
        onGoTo={goTo}
      />
    </div>
  );
}
