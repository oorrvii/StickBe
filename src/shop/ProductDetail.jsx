import { useState } from "react";
import { Heart, Share2, ChevronDown } from "lucide-react";
import QtyInput from "./QtyInput.jsx";
import { Dialog } from "../ui/index.js";
import FitImage from "../site/FitImage.jsx";
import { isAvailable, priceInfo, discountedPrice, stockNote } from "./shopLogic.js";

const SHIPPING_POINTS = [
  "Flat ₹40 delivery, ₹20 within Agra. Minimum order ₹99.",
  "No Cash on Delivery. Prepayment is required on all orders.",
  "Every order is packed by hand, big or small. Bulk orders are welcome.",
];

function galleryOf(item) {
  const list = Array.isArray(item.images) && item.images.length > 0 ? item.images : item.image ? [item.image] : [];
  return list;
}

export default function ProductDetail({ item, discountPercent, inWishlist, onToggleWishlist, onAdd, onClose, onShare, cartQty = 0 }) {
  const [index, setIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [variantLabel, setVariantLabel] = useState(null);

  const slug = item?.slug;

  if (!item) return null;

  const images = galleryOf(item);
  const variants = Array.isArray(item.variants) ? item.variants : [];
  const hasVariants = variants.length > 0;
  const chosen = hasVariants ? variants.find((v) => v.label === variantLabel) : null;
  const available = isAvailable(item);
  const maxQty = typeof item.stock === "number" && !hasVariants ? Math.max(1, item.stock) : 9999;
  const info = chosen
    ? { from: false, original: Number(chosen.price), current: discountedPrice(Number(chosen.price), discountPercent), hasDiscount: discountPercent > 0 }
    : priceInfo(item, discountPercent);
  const note = stockNote(item);
  const needsChoice = hasVariants && !chosen;

  const add = () => {
    if (needsChoice || !available) return;
    onAdd(item, qty, chosen);
  };

  return (
    <Dialog open onClose={onClose} size="lg" ariaLabel={item.name} zIndex={45}>
      <div className="sb-detail">
        <div className="sb-detail__gallery">
          <div className="sb-detail__stage">
            {images.length > 0 ? <FitImage key={images[index]} src={images[index]} alt={`${item.name}, photo ${index + 1} of ${images.length}`} loading="eager" /> : <span className="sb-fit"><span className="sb-fit__missing">Photo coming soon</span></span>}
          </div>
          {images.length > 1 && (
            <div className="sb-detail__thumbs" role="group" aria-label="Product photos">
              {images.map((src, i) => (
                <button key={src} type="button" className={`sb-detail__thumb${i === index ? " is-active" : ""}`} onClick={() => setIndex(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === index}>
                  <FitImage src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sb-detail__info">
          {item.categoryLabel && <p className="sb-detail__cat">{item.categoryLabel}</p>}
          <h2 className="sb-detail__title">{item.name}</h2>
          <p className="sb-detail__price">
            {info.from && <span className="sb-tile__from">From </span>}
            <strong>₹{info.current}</strong>
            {info.hasDiscount && <s>₹{info.original}</s>}
            {info.hasDiscount && <span className="sb-detail__off">{discountPercent}% OFF</span>}
          </p>
          {note && <p className={`sb-tile__note sb-tile__note--${note.tone}`}>{note.text}</p>}
          {item.description && <p className="sb-detail__desc">{item.description}</p>}

          {hasVariants && (
            <fieldset className="sb-detail__variants">
              <legend>Choose an option</legend>
              {variants.map((v) => (
                <label key={v.label} className={`sb-detail__variant${variantLabel === v.label ? " is-active" : ""}`}>
                  <input type="radio" name={`variant-${slug}`} checked={variantLabel === v.label} onChange={() => setVariantLabel(v.label)} />
                  <span>{v.label}</span>
                  <span>₹{discountedPrice(Number(v.price), discountPercent)}</span>
                </label>
              ))}
            </fieldset>
          )}

          <div className="sb-detail__buy">
            <QtyInput value={qty} onChange={setQty} min={1} max={maxQty} />
            <button type="button" className="sb-btn sb-btn--primary sb-detail__add" onClick={add} disabled={!available || needsChoice}>
              {!available ? "Sold out" : needsChoice ? "Choose an option" : "Add to cart"}
            </button>
          </div>

          {cartQty > 0 && <p className="sb-detail__incart" role="status">You already have {cartQty} in your cart.</p>}
          <p className="sb-detail__bulk">Need a big quantity? Just type it in the box, we ship bulk orders too.</p>

          <div className="sb-detail__secondary">
            <button type="button" className="sb-btn sb-btn--ghost sb-btn--sm" onClick={() => onToggleWishlist(item.name)} aria-pressed={inWishlist}>
              <Heart size={16} aria-hidden="true" fill={inWishlist ? "#b3392f" : "none"} stroke={inWishlist ? "#b3392f" : "currentColor"} />
              {inWishlist ? "Saved" : "Save"}
            </button>
            <button type="button" className="sb-btn sb-btn--ghost sb-btn--sm" onClick={() => onShare(item)}>
              <Share2 size={16} aria-hidden="true" /> Share
            </button>
          </div>

          <div className="sb-detail__sections">
            {item.description && (
              <details className="sb-acc" open>
                <summary>About this item <ChevronDown size={18} aria-hidden="true" /></summary>
                <p>{item.description}</p>
              </details>
            )}
            <details className="sb-acc" open>
              <summary>Shipping and payment <ChevronDown size={18} aria-hidden="true" /></summary>
              <ul>
                {SHIPPING_POINTS.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </details>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
