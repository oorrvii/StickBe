import { Card } from "../ui/index.js";
import FitImage from "../site/FitImage.jsx";

export default function OrderSummary({ title = "Your order", lines, subtotal, deliveryFee, total, footnote }) {
  return (
    <Card padded className="sb-summary">
      <h2>{title}</h2>
      <ul className="sb-summary__items">
        {lines.map((l) => (
          <li key={l.key} className="sb-summary__item">
            <div className="sb-cartline__img">
              {l.image ? <FitImage src={l.image} alt="" /> : <span className="sb-fit"><span className="sb-fit__missing">&nbsp;</span></span>}
            </div>
            <div>
              <strong>{l.name}</strong>
              <div>{l.qty} × ₹{l.price}</div>
            </div>
            <strong>₹{l.qty * l.price}</strong>
          </li>
        ))}
      </ul>
      <dl className="sb-summary__rows">
        <div><dt>Subtotal</dt><dd>₹{subtotal}</dd></div>
        <div><dt>Delivery</dt><dd>{deliveryFee === null ? "Added once you enter your city" : `₹${deliveryFee}`}</dd></div>
        <div className="sb-summary__total"><dt>Total</dt><dd>₹{total}</dd></div>
      </dl>
      {footnote && <p className="sb-summary__note">{footnote}</p>}
    </Card>
  );
}
