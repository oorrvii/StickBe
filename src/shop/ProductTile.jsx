import { Heart } from "lucide-react";
import FitImage from "../site/FitImage.jsx";
import { itemImage, isAvailable, priceInfo, stockNote, toneOf } from "./shopLogic.js";

export default function ProductTile({ item, discountPercent, inWishlist, onToggleWishlist, cartQty, onOpen }) {
  const available = isAvailable(item);
  const price = priceInfo(item, discountPercent);
  const note = stockNote(item);
  const cover = itemImage(item);

  return (
    <article id={`product-${item.slug}`} className={`sb-tile${available ? "" : " sb-tile--soldout"}`}>
      <div className="sb-tile__media" data-tone={toneOf(item)}>
        <button type="button" className="sb-tile__open" onClick={() => onOpen(item)} aria-label={`View ${item.name}`}>
          {cover ? <FitImage src={cover} alt="" /> : <span className="sb-fit"><span className="sb-fit__missing">Photo coming soon</span></span>}
        </button>
        {discountPercent > 0 && available && <span className="sb-tile__off">{discountPercent}% OFF</span>}
        {!available && <span className="sb-tile__sold">Sold out</span>}
        <button
          type="button"
          className="sb-tile__heart"
          onClick={() => onToggleWishlist(item.name)}
          aria-label={inWishlist ? `Remove ${item.name} from wishlist` : `Add ${item.name} to wishlist`}
          aria-pressed={inWishlist}
        >
          <Heart size={17} aria-hidden="true" fill={inWishlist ? "#b3392f" : "none"} stroke={inWishlist ? "#b3392f" : "currentColor"} />
        </button>
      </div>

      <div className="sb-tile__body">
        <button type="button" className="sb-tile__name" onClick={() => onOpen(item)}>
          {item.name}
        </button>
        <p className="sb-tile__price">
          {price.from && <span className="sb-tile__from">From </span>}
          <strong>₹{price.current}</strong>
          {price.hasDiscount && <s>₹{price.original}</s>}
        </p>
        <p className={`sb-tile__note${note ? ` sb-tile__note--${note.tone}` : ""}`}>{note && note.text !== "Sold out" ? note.text : " "}</p>

        <div className="sb-tile__actions">
          {cartQty > 0 && <p className="sb-tile__incart">In your cart: {cartQty}</p>}
          <button type="button" className="sb-btn sb-btn--secondary sb-btn--sm sb-btn--block" onClick={() => onOpen(item)}>
            View details
          </button>
        </div>
      </div>
    </article>
  );
}
