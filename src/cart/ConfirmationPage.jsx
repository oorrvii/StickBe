import { Link, useLocation, useParams } from "react-router-dom";
import { Card } from "../ui/index.js";
import { useAccount } from "../app/AccountContext.jsx";
import { useCatalog } from "../shop/CatalogContext.jsx";
import { itemImage } from "../shop/shopLogic.js";
import OrderSummary from "./OrderSummary.jsx";
import "./cart.css";

function lastOrder(number) {
  try {
    const o = JSON.parse(sessionStorage.getItem("stickbe_last_order") || "null");
    return o && o.orderNumber === number ? o : null;
  } catch {
    return null;
  }
}

export default function ConfirmationPage() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const { user } = useAccount();
  const { categories } = useCatalog();
  const order = location.state?.order || lastOrder(orderNumber);

  if (!order) {
    return (
      <div className="sb-page">
        <Card padded>
          <h1>We couldn't find that order here</h1>
          <p className="sb-account__lead">If you just placed it, it's safe with us and we'll contact you soon. Quote <span className="sb-confirm__ref">{orderNumber}</span> if you need to ask about it.</p>
          <Link className="sb-btn sb-btn--primary" to="/#shop">Continue shopping</Link>
        </Card>
      </div>
    );
  }

  const flat = categories.flatMap((c) => c.items);
  const lines = order.items.map((i, idx) => {
    const p = flat.find((x) => x.slug === i.slug);
    return { key: `${i.slug}-${idx}`, name: i.name, qty: i.qty, price: i.price, image: p ? itemImage(p) : null };
  });

  return (
    <div className="sb-page sb-confirm">
      <div>
        <p className="sb-eyebrow">Order request received</p>
        <h1>Thank you, we have your request.</h1>
        <p>Your order reference is <span className="sb-confirm__ref">{order.orderNumber}</span></p>
        <p>This is a request, not a confirmed order. We will contact you using the details you gave us ({order.customer.email}, +91 {order.customer.phone}).</p>
        <p>Payment details are sent to you manually, and only after we approve the request. Please do not pay anyone before you hear from us. Nothing has been charged.</p>
        <div className="sb-account__actions">
          {user && order.userId === user.uid && <Link className="sb-btn sb-btn--primary" to={`/account/orders/${order.id}`}>View this order</Link>}
          <Link className="sb-btn sb-btn--secondary" to="/#shop">Continue shopping</Link>
        </div>
      </div>
      <aside>
        <OrderSummary title="Your request" lines={lines} subtotal={order.subtotal} deliveryFee={order.deliveryFee} total={order.total} />
      </aside>
    </div>
  );
}
