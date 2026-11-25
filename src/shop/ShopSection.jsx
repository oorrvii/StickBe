import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Alert, EmptyState, Skeleton, Button } from "../ui/index.js";
import ProductTile from "./ProductTile.jsx";
import ProductDetail from "./ProductDetail.jsx";
import Pagination from "./Pagination.jsx";
import { SORTS, filterItems, sortItems } from "./shopLogic.js";

const PAGE_SIZE = 20;

function slugFromPath() {
  const m = window.location.pathname.match(/^\/product\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export default function ShopSection({
  categories, loading, error, discountPercent, wishlist, cart,
  activeCategory, onCategoryChange, onToggleWishlist, onAdd, onShare, onRetry, shippingNote = "",
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [openSlug, setOpenSlug] = useState(slugFromPath);
  const topRef = useRef(null);

  const everyItem = useMemo(
    () => categories.flatMap((c) => c.items.map((i) => ({ ...i, categoryLabel: c.label, categoryId: c.id }))),
    [categories]
  );

  const visible = useMemo(() => {
    const base = activeCategory === "all" ? everyItem : everyItem.filter((i) => i.categoryId === activeCategory);
    return sortItems(filterItems(base, { query, inStockOnly }), sort, discountPercent);
  }, [everyItem, activeCategory, query, inStockOnly, sort, discountPercent]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    const onPop = () => setOpenSlug(slugFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const opened = openSlug ? everyItem.find((i) => i.slug === openSlug) : null;

  const openItem = (item) => {
    window.history.pushState({}, "", `/product/${encodeURIComponent(item.slug)}`);
    setOpenSlug(item.slug);
  };
  const closeItem = () => {
    if (slugFromPath()) window.history.pushState({}, "", "/");
    setOpenSlug(null);
  };

  const changePage = (p) => {
    setPage(p);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearFilters = () => { setQuery(""); setInStockOnly(false); onCategoryChange("all"); setPage(1); };
  const filtersActive = query || inStockOnly || activeCategory !== "all";
  const qtyOf = (item) => cart.filter((c) => c.name === item.name || c.name.startsWith(`${item.name} (`)).reduce((n, c) => n + c.qty, 0);

  return (
    <div className="sb2 sb-shop" ref={topRef}>
      <div className="sb-shop__tabs" role="tablist" aria-label="Categories">
        {[{ id: "all", label: "All" }, ...categories].map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={activeCategory === c.id} className={`sb-chip${activeCategory === c.id ? " is-active" : ""}`} onClick={() => { onCategoryChange(c.id); setPage(1); }}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="sb-shop__toolbar">
        <label className="sb-shop__search">
          <Search size={17} aria-hidden="true" />
          <input type="search" className="sb-input" placeholder="Search stickers, frames, journals…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} aria-label="Search products" />
          {query && (
            <button type="button" className="sb-shop__clear" onClick={() => { setQuery(""); setPage(1); }} aria-label="Clear search"><X size={16} aria-hidden="true" /></button>
          )}
        </label>
        <label className="sb-shop__sort">
          <span className="sb-visually-hidden">Sort by</span>
          <select className="sb-input" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="sb-shop__toggle">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => { setInStockOnly(e.target.checked); setPage(1); }} />
          In stock only
        </label>
      </div>

      {!loading && !error && (
        <p className="sb-shop__count" aria-live="polite">
          {visible.length} {visible.length === 1 ? "item" : "items"}
        </p>
      )}

      {error ? (
        <Alert tone="error">
          We couldn't load the shop right now. Check your connection and try again.{" "}
          {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button>}
        </Alert>
      ) : loading ? (
        <div className="sb-grid" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="sb-tile"><Skeleton height={0} style={{ paddingBottom: "100%", display: "block" }} /><div className="sb-tile__body"><Skeleton height={14} /><Skeleton width="40%" height={14} /></div></div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState title="No products match" action={filtersActive ? <Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button> : null}>
          Try a different word or remove a filter.
        </EmptyState>
      ) : (
        <div className="sb-grid">
          {pageItems.map((item) => (
            <ProductTile
              key={item.slug || item.name}
              item={item}
              discountPercent={discountPercent}
              inWishlist={wishlist.includes(item.name)}
              onToggleWishlist={onToggleWishlist}
              cartQty={qtyOf(item)}
              onOpen={openItem}
            />
          ))}
        </div>
      )}

      <Pagination page={safePage} totalPages={totalPages} onChange={changePage} />

      <ProductDetail
        key={openSlug || "none"}
        item={opened}
        cartQty={opened ? qtyOf(opened) : 0}
        discountPercent={discountPercent}
        shippingNote={shippingNote}
        inWishlist={opened ? wishlist.includes(opened.name) : false}
        onToggleWishlist={onToggleWishlist}
        onAdd={(item, qty, variant) => onAdd(item, qty, variant)}
        onShare={onShare}
        onClose={closeItem}
      />
    </div>
  );
}
