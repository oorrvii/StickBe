import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, Badge, Button, Card, EmptyState, Input, Select, Skeleton } from "../ui/index.js";
import { ORDER_STATUS, STATUS_ORDER, formatOrderDate, statusId, statusOf } from "../app/orderUtils.js";
import { useOrderService } from "./ServiceContext.jsx";
import { useAsync } from "./useAsync.js";
import { ordersToCsv } from "./orderFlow.js";

export default function AdminOrders() {
  const service = useOrderService();
  const load = useCallback(() => service.listOrders(), [service]);
  const { data: orders, loading, error, retry } = useAsync(load);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const status = STATUS_ORDER.includes(params.get("status")) ? params.get("status") : "all";

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (orders || []).filter((o) => {
      if (status !== "all" && statusId(o) !== status) return false;
      if (!q) return true;
      const c = o.customer || {};
      return [o.orderNumber, o.id, c.name, c.email, c.phone, c.instagram].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [orders, search, status]);

  const downloadCsv = () => {
    const csv = ordersToCsv(orders || [], (o) => statusOf(o).label, formatOrderDate);
    const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `stickbe-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <header className="sb-account__head">
        <div>
          <p className="sb-eyebrow">Orders</p>
          <h1>Orders</h1>
          <p className="sb-account__lead">Review new order requests, approve or reject them, and confirm the final amount.</p>
        </div>
        <Button variant="secondary" onClick={downloadCsv} disabled={!orders || orders.length === 0}>Download backup (CSV)</Button>
      </header>

      <div className="sb-admin__filters">
        <Input label="Search" placeholder="Order number, name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setParams(e.target.value === "all" ? {} : { status: e.target.value })}
        >
          <option value="all">All statuses</option>
          {STATUS_ORDER.map((id) => <option key={id} value={id}>{ORDER_STATUS[id].label}</option>)}
        </Select>
      </div>

      {error ? (
        <Alert tone="error">We couldn't load orders. <Button size="sm" variant="secondary" onClick={retry}>Try again</Button></Alert>
      ) : loading ? (
        <div className="sb-orders" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} height={96} style={{ display: "block" }} />)}</div>
      ) : shown.length === 0 ? (
        <Card><EmptyState title={orders.length ? "No orders match" : "No orders yet"}>{orders.length ? "Try another search or status." : "New order requests will show up here."}</EmptyState></Card>
      ) : (
        <div className="sb-orders">
          {shown.map((o) => {
            const s = statusOf(o);
            const items = o.items || [];
            return (
              <Link key={o.id} className="sb-order" to={`/admin/orders/${o.orderNumber || o.id}`}>
                <div className="sb-order__top">
                  <div>
                    <p className="sb-order__num">{o.orderNumber || o.id}</p>
                    <p className="sb-order__date">{(o.customer && o.customer.name) || "Customer"} · {o.createdAt ? formatOrderDate(o.createdAt) : ""}</p>
                  </div>
                  <div className="sb-admin__badges"><Badge tone={s.tone}>{s.label}</Badge><Badge tone="ink">{s.payment}</Badge></div>
                </div>
                <div className="sb-order__bottom">
                  <p className="sb-order__items">{items.slice(0, 2).map((i) => i.name).join(", ")}{items.length > 2 ? ` and ${items.length - 2} more` : ""}</p>
                  <strong>₹{o.total}</strong>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
