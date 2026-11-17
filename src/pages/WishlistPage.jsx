import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, EmptyState, Button, Skeleton } from "../ui/index.js";
import ProductTile from "../shop/ProductTile.jsx";
import "../shop/shop.css";
import { useAccount } from "../app/AccountContext.jsx";
import { useCatalog } from "../shop/CatalogContext.jsx";

export default function WishlistPage({ discountPercent }) {
  const { wishlist, setWishlist, cart, user } = useAccount();
  const { categories, loading, error, reload } = useCatalog();
  const navigate = useNavigate();

  const items = useMemo(
    () =>
      categories.flatMap((c) =>
        c.items.filter((i) => wishlist.includes(i.name)).map((i) => ({ ...i, categoryLabel: c.label, categoryId: c.id }))
      ),
    [categories, wishlist]
  );

  const toggle = (name) => setWishlist((w) => (w.includes(name) ? w.filter((n) => n !== name) : [...w, name]));
  const qtyOf = (item) => cart.filter((c) => c.name === item.name || c.name.startsWith(`${item.name} (`)).reduce((n, c) => n + c.qty, 0);

  return (
    <div className="sb-page">
      <p className="sb-eyebrow">Saved for later</p>
      <h1>Your wishlist</h1>
      {!user && wishlist.length > 0 && (
        <div className="sb-page__note">
          <Alert tone="info">
            Saved on this device only. <Link className="sb-linkbtn sb-linkbtn--strong" to="/sign-in?next=/wishlist">Log in</Link> to keep it on every device.
          </Alert>
        </div>
      )}
      {error ? (
        <Alert tone="error">We couldn't load your items. <Button size="sm" variant="secondary" onClick={reload}>Try again</Button></Alert>
      ) : loading ? (
        <div className="sb-grid" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={260} style={{ display: "block" }} />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Nothing saved yet" action={<Button variant="secondary" size="sm" onClick={() => navigate("/#shop")}>Browse the shop</Button>}>
          Tap the heart on anything you like and it will show up here.
        </EmptyState>
      ) : (
        <div className="sb-grid">
          {items.map((item) => (
            <ProductTile
              key={item.slug || item.name}
              item={item}
              discountPercent={discountPercent}
              inWishlist
              onToggleWishlist={toggle}
              cartQty={qtyOf(item)}
              onOpen={(it) => navigate(`/product/${encodeURIComponent(it.slug)}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
