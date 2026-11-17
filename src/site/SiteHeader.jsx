import { Heart, ShoppingCart, Menu } from "lucide-react";

const LINKS = [
  { id: "shop", label: "Shop" },
  { id: "story", label: "Our story" },
  { id: "gallery", label: "Moments" },
  { id: "feedback", label: "Contact" },
];

export default function SiteHeader({
  logoSrc,
  accountSlot,
  wishlistCount,
  cartCount,
  onOpenMenu,
  onOpenWishlist,
  onOpenCart,
  onGoTo,
}) {
  return (
    <header className="sb2 sb-header">
      <a className="sb-skip" href="#shop">
        Skip to products
      </a>
      <div className="sb-header__inner">
        <div className="sb-header__left">
          <button type="button" className="sb-iconbtn sb-header__menu" onClick={onOpenMenu} aria-label="Open menu">
            <Menu size={22} aria-hidden="true" />
          </button>
          <a className="sb-brand" href="/" aria-label="StickBe home">
            {logoSrc && <img src={logoSrc} alt="" width="36" height="36" />}
            <span>StickBe</span>
          </a>
        </div>

        <nav className="sb-header__nav" aria-label="Main">
          {LINKS.map((link) => (
            <button key={link.id} type="button" className="sb-navlink" onClick={() => onGoTo(link.id)}>
              {link.label}
            </button>
          ))}
        </nav>

        <div className="sb-header__actions">
          {accountSlot}
          <button type="button" className="sb-iconbtn" onClick={onOpenWishlist} aria-label={`Wishlist, ${wishlistCount} items`}>
            <Heart size={20} aria-hidden="true" />
            {wishlistCount > 0 && <span className="sb-count">{wishlistCount}</span>}
          </button>
          <button type="button" className="sb-iconbtn" onClick={onOpenCart} aria-label={`Cart, ${cartCount} items`}>
            <ShoppingCart size={20} aria-hidden="true" />
            {cartCount > 0 && <span className="sb-count">{cartCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
