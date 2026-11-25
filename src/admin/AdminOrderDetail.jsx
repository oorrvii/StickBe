import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Badge, Button, Card, EmptyState, Skeleton } from "../ui/index.js";
import FitImage from "../site/FitImage.jsx";
import { useCatalog } from "../shop/CatalogContext.jsx";
import { itemImage } from "../shop/shopLogic.js";
import { formatOrderDate, historyOf, statusId, statusOf } from "../app/orderUtils.js";
import { useOrderService } from "./ServiceContext.jsx";
import { useAsync } from "./useAsync.js";
import { FlowError, catalogCheck, contactSummary } from "./orderFlow.js";
import {
  CancelSection, ContactSection, DispatchSection, HistorySection, MessageSection, NotesSection, ReviewSection, SimpleStep, VerifySection,
} from "./OrderSections.jsx";

function ItemsCard({ order, products, status }) {
  const issues = status === "new" ? catalogCheck(order, products) : [];
  return (
    <Card padded className="sb-adminsec">
      <h2>Items</h2>
      <ul className="sb-summary__items">
        {(order.items || []).map((i, idx) => {
          const p = products.find((x) => x.slug === i.slug);
          const img = p ? itemImage(p) : null;
          return (
            <li key={idx} className="sb-summary__item">
              <div className="sb-cartline__img">{img ? <FitImage src={img} alt="" /> : <span className="sb-fit"><span className="sb-fit__missing">&nbsp;</span></span>}</div>
              <div><strong>{i.name}</strong><div>{i.qty} × ₹{i.price}</div></div>
              <strong>₹{i.qty * i.price}</strong>
            </li>
          );
        })}
      </ul>
      {status === "new" && (issues.length === 0
        ? <p className="sb-adminsec__lead">Prices match the catalogue.</p>
        : <Alert tone="warning">{issues.map((t) => <div key={t}>{t}</div>)}</Alert>)}
      <dl className="sb-summary__rows">
        <div><dt>Items total (customer)</dt><dd>₹{order.subtotal}</dd></div>
        {order.discountPercent > 0 && <div><dt>Sale applied</dt><dd>{order.discountPercent}% off</dd></div>}
        <div><dt>Shipping</dt><dd>₹{order.deliveryFee ?? 0}</dd></div>
        <div className="sb-summary__total"><dt>Final total</dt><dd>₹{order.total}</dd></div>
      </dl>
      {order.adjustmentReason && <p className="sb-adminsec__lead">Total adjusted: {order.adjustmentReason}</p>}
      {order.dispatch?.courier && (
        <p className="sb-adminsec__lead">
          Courier: {order.dispatch.courier}
          {order.dispatch.trackingNumber ? ` · ${order.dispatch.trackingNumber}` : ""}
          {order.dispatch.trackingUrl ? <> · <a href={order.dispatch.trackingUrl} target="_blank" rel="noopener noreferrer">Track</a></> : null}
        </p>
      )}
    </Card>
  );
}

function CustomerCard({ order, priv }) {
  const c = order.customer || {};
  const ig = String(c.instagram || "").replace(/^@/, "");
  return (
    <Card padded className="sb-adminsec">
      <h2>Customer</h2>
      <p className="sb-addr__text"><strong>{c.name}</strong></p>
      {c.email && <p className="sb-addr__text"><a href={`mailto:${c.email}`}>{c.email}</a></p>}
      {c.phone && <p className="sb-addr__text"><a href={`tel:+91${c.phone}`}>+91 {c.phone}</a></p>}
      {ig && <p className="sb-addr__text"><a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer">@{ig}</a></p>}
      <h3>Shipping address</h3>
      <p className="sb-addr__text"><strong>{c.name}</strong></p>
      <p className="sb-addr__text">{[c.address1 || c.address, c.address2].filter(Boolean).join(", ")}</p>
      {c.landmark && <p className="sb-addr__text">Landmark: {c.landmark}</p>}
      <p className="sb-addr__text">{c.city}, {c.state} {c.pincode}</p>
      {c.phone && <p className="sb-addr__text">+91 {c.phone}</p>}
      {order.note && <p className="sb-addr__text">Customer note: {order.note}</p>}
      <p className="sb-addr__text sb-adminsec__lead">Contact status: {contactSummary(priv, formatOrderDate)}</p>
    </Card>
  );
}

export default function AdminOrderDetail({ orderNumber }) {
  const service = useOrderService();
  const load = useCallback(() => service.getOrder(orderNumber), [service, orderNumber]);
  const { data, loading, error, retry, setData } = useAsync(load);
  const { categories } = useCatalog();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const products = categories.flatMap((c) => c.items);

  // Runs one change, shows the result at the top, and returns { ok, error } to the section that asked.
  const runService = async (fn, success) => {
    setBusy(true);
    try {
      const out = await fn(service);
      setData({ order: out.order, priv: out.priv });
      setNotice(success);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return { ok: true };
    } catch (err) {
      if (!(err instanceof FlowError)) console.error(err);
      return { ok: false, error: err instanceof FlowError ? err.message : "That didn't save. Check your connection and try again." };
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div aria-busy="true"><Skeleton height={60} style={{ display: "block", marginBottom: 16 }} /><Skeleton height={320} style={{ display: "block" }} /></div>;
  if (error) return <Alert tone="error">We couldn't load this order. <Button size="sm" variant="secondary" onClick={retry}>Try again</Button> <Link className="sb-linkbtn sb-linkbtn--strong" to="/admin/orders">All orders</Link></Alert>;
  if (!data) return <Card><EmptyState title="Order not found" action={<Link className="sb-btn sb-btn--secondary sb-btn--sm" to="/admin/orders">All orders</Link>}>We couldn't find an order with that number.</EmptyState></Card>;

  const { order, priv } = data;
  const status = statusId(order);
  const meta = statusOf(order);
  const run = (action, payload, success) => runService((s) => s.act(order.id, action, payload), success);

  return (
    <>
      <Link className="sb-linkbtn sb-linkbtn--strong" to="/admin/orders">All orders</Link>
      <header className="sb-account__head sb-admin__orderhead">
        <div>
          <p className="sb-eyebrow">Order</p>
          <h1>{order.orderNumber || order.id}</h1>
          {order.createdAt && <p className="sb-account__lead">Placed {formatOrderDate(order.createdAt)}</p>}
        </div>
        <div className="sb-admin__badges"><Badge tone={meta.tone}>{meta.label}</Badge><Badge tone="ink">{meta.payment}</Badge></div>
      </header>

      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="sb-admin__stack">
        <div className="sb-admin__two">
          <ItemsCard order={order} products={products} status={status} />
          <CustomerCard order={order} priv={priv} />
        </div>

        {status === "new" && <ReviewSection key="review" order={order} run={run} busy={busy} />}
        {status === "approved" && <ContactSection key="contact" order={order} priv={priv} runService={runService} />}
        {status === "approved" && <VerifySection key="verify" order={order} run={run} busy={busy} />}
        {status === "paid" && <SimpleStep title="Prepare the order" lead="Payment is verified. Start preparing the order." label="Start processing" action="startProcessing" success="Order moved to processing." run={run} busy={busy} />}
        {status === "processing" && <DispatchSection key="dispatch" run={run} busy={busy} />}
        {status === "dispatched" && <SimpleStep title="Delivery" lead="Mark as delivered only once you know it arrived." label="Mark delivered" action="deliver" success="Order marked as delivered." run={run} busy={busy} />}
        {["approved", "paid", "processing"].includes(status) && <CancelSection run={run} busy={busy} />}

        <NotesSection key={`notes-${order.updatedAt || 0}`} order={order} priv={priv} runService={runService} />
        <HistorySection history={historyOf(order)} />
        <MessageSection key={`msg-${status}`} order={order} />
      </div>
    </>
  );
}
