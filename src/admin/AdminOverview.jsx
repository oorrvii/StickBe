import { useCallback } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Skeleton } from "../ui/index.js";
import { useCatalog } from "../shop/CatalogContext.jsx";
import { statusId } from "../app/orderUtils.js";
import { useOrderService } from "./ServiceContext.jsx";
import { useAsync } from "./useAsync.js";

export const LOW_STOCK_AT = 5;

function Stat({ to, value, label, tone }) {
  return (
    <Link to={to} className={`sb-stat${tone ? ` sb-stat--${tone}` : ""}`}>
      <span className="sb-stat__num">{value}</span>
      <span className="sb-stat__label">{label}</span>
    </Link>
  );
}

export default function AdminOverview() {
  const service = useOrderService();
  const load = useCallback(() => service.listOrders(), [service]);
  const { data: orders, loading, error, retry } = useAsync(load);
  const { categories, loading: catalogLoading } = useCatalog();

  const items = categories.flatMap((c) => c.items).filter((i) => !i.isCustom);
  const count = (id) => (orders || []).filter((o) => statusId(o) === id).length;
  const lowStock = items.filter((i) => typeof i.stock === "number" && i.stock > 0 && i.stock <= LOW_STOCK_AT).length;
  const outOfStock = items.filter((i) => typeof i.stock === "number" && i.stock <= 0).length;

  return (
    <>
      <header className="sb-account__head">
        <div>
          <p className="sb-eyebrow">Overview</p>
          <h1>Overview</h1>
          <p className="sb-account__lead">A quick look at your orders and catalogue.</p>
        </div>
      </header>
      {error && <Alert tone="error">We couldn't load your orders. <Button size="sm" variant="secondary" onClick={retry}>Try again</Button></Alert>}
      {loading ? (
        <div className="sb-stats" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={110} style={{ display: "block" }} />)}</div>
      ) : (
        !error && (
          <div className="sb-stats">
            <Stat to="/admin/orders?status=new" value={count("new")} label="New order requests" tone="violet" />
            <Stat to="/admin/orders?status=approved" value={count("approved")} label="Approved, awaiting payment" />
            <Stat to="/admin/orders?status=paid" value={count("paid") + count("processing")} label="Paid, to prepare" tone="sage" />
            <Stat to="/admin/orders?status=dispatched" value={count("dispatched")} label="Dispatched" />
            <Stat to="/admin/orders?status=delivered" value={count("delivered")} label="Delivered" />
            <Stat to="/admin/orders" value={(orders || []).length} label="All orders" />
          </div>
        )
      )}
      <h2 className="sb-admin__sub">Catalogue</h2>
      {catalogLoading ? (
        <Skeleton height={110} style={{ display: "block" }} />
      ) : (
        <div className="sb-stats">
          <Stat to="/admin/classic" value={items.length} label="Products listed" />
          <Stat to="/admin/classic" value={lowStock} label={`Low stock (${LOW_STOCK_AT} or fewer)`} tone={lowStock ? "terracotta" : undefined} />
          <Stat to="/admin/classic" value={outOfStock} label="Out of stock" tone={outOfStock ? "terracotta" : undefined} />
        </div>
      )}
    </>
  );
}
