import { Link, useNavigate } from "react-router-dom";
import { Alert, Button, Card, EmptyState, Skeleton } from "../ui/index.js";
import FitImage from "../site/FitImage.jsx";
import QtyInput from "../shop/QtyInput.jsx";
import { useAccount } from "../app/AccountContext.jsx";
import { useCatalog } from "../shop/CatalogContext.jsx";
import { MIN_ORDER_VALUE, changeQty, removeLine, resolveLines, summarize } from "./cartLogic.js";
import "./cart.css";

export default function CartPage({ discountPercent }) {
  const { cart, setCart } = useAccount();
  const { categories, loading, error, reload } = useCatalog();
  const navigate = useNavigate();

  const lines = resolveLines(cart, categories, discountPercent);
  const s = summarize(lines, "");
  const canCheckout = !loading && !error && lines.length > 0 && !s.hasProblems && s.meetsMinimum;

  return (
    <div className="sb-page">
      <h1>Your cart</h1>
      {error && (
        <Alert tone="error">
          We couldn't check current prices. <Button size="sm" variant="secondary" onClick={reload}>Try again</Button>
        </Alert>
      )}
      {cart.length === 0 ? (
        <Card>
          <EmptyState title="Your cart is empty" action={<Link className="sb-btn sb-btn--primary sb-btn--sm" to="/#shop">Browse the shop</Link>}>
            Add something you like and it will wait for you here.
          </EmptyState>
        </Card>
      ) : (
        <div className="sb-cart">
          <div className="sb-cart__lines">
            {loading
              ? cart.map((_, i) => <Skeleton key={i} height={110} style={{ display: "block" }} />)
              : lines.map((l) => (
                  <Card key={l.rawKey} padded className="sb-cartline">
                    <div className="sb-cartline__img">
                      {l.image ? <FitImage src={l.image} alt="" /> : <span className="sb-fit"><span className="sb-fit__missing">No photo</span></span>}
                    </div>
                    <div className="sb-cartline__body">
                      <div className="sb-cartline__top">
                        {l.slug ? <Link to={`/product/${encodeURIComponent(l.slug)}`} className="sb-cartline__name">{l.name}</Link> : <span className="sb-cartline__name">{l.name}</span>}
                        <strong>₹{l.unit * l.qty}</strong>
                      </div>
                      <p className="sb-cartline__each">
                        ₹{l.unit} each
                        {discountPercent > 0 && <s>₹{l.listPrice}</s>}
                      </p>
                      {l.problem && <p className="sb-cartline__problem" role="alert">{l.problem}</p>}
                      <div className="sb-cartline__actions">
                        {l.problem && !l.product ? null : (
                          <QtyInput value={l.qty} min={1} max={l.maxQty} onChange={(n) => changeQty(setCart, l.rawKey, n)} label={`Quantity of ${l.name}`} />
                        )}
                        <button type="button" className="sb-linkbtn" onClick={() => removeLine(setCart, l.rawKey)}>Remove</button>
                      </div>
                    </div>
                  </Card>
                ))}
            <div><Link className="sb-btn sb-btn--secondary" to="/#shop">Continue shopping</Link></div>
          </div>

          <aside className="sb-summary">
            <Card padded>
              <h2>Summary</h2>
              <dl className="sb-summary__rows">
                <div><dt>Subtotal</dt><dd>₹{s.subtotal}</dd></div>
                <div><dt>Delivery</dt><dd>₹40, or ₹20 within Agra</dd></div>
              </dl>
              <p className="sb-summary__note">Delivery is added at checkout once we know your city. Cash on Delivery is not available, orders are prepaid.</p>
              {!loading && !s.meetsMinimum && <Alert tone="warning">Add ₹{s.shortBy} more to reach the ₹{MIN_ORDER_VALUE} minimum order.</Alert>}
              {s.hasProblems && <Alert tone="warning">Fix the items marked above to continue.</Alert>}
              <Alert tone="info">This is an order request. We review it first, then contact you with payment details.</Alert>
              <Button block size="lg" disabled={!canCheckout} onClick={() => navigate("/checkout")}>Proceed to checkout</Button>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
