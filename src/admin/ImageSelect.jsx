import { useState } from "react";
import images from "./productImages.json";

const OTHER = "__other__";

/** Choose a photo from public/products, or type a path if it is not in the list yet. */
export default function ImageSelect({ label, value, onChange, error, hint }) {
  const known = images.includes(value);
  const [custom, setCustom] = useState(!!value && !known);
  const id = `img-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="sb-imgsel">
      <label className="sb-field__label" htmlFor={id}>{label}</label>
      <div className="sb-imgsel__row">
        <div className="sb-imgsel__thumb" aria-hidden="true">{value ? <img src={value} alt="" /> : <span>No photo</span>}</div>
        <div className="sb-imgsel__controls">
          <select id={id} className="sb-input" value={custom ? OTHER : value || ""} aria-invalid={!!error}
            onChange={(e) => {
              if (e.target.value === OTHER) { setCustom(true); return; }
              setCustom(false);
              onChange(e.target.value);
            }}>
            <option value="">Choose a photo…</option>
            {images.map((f) => <option key={f} value={f}>{f.replace("/products/", "")}</option>)}
            <option value={OTHER}>Other path…</option>
          </select>
          {custom && <input className="sb-input" placeholder="/products/my-photo.jpg" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} path`} />}
        </div>
      </div>
      {hint && !error && <p className="sb-field__hint">{hint}</p>}
      {error && <p className="sb-field__error">{error}</p>}
    </div>
  );
}
