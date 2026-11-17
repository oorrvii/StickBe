import { useState } from "react";
import { Minus, Plus } from "lucide-react";

export default function QtyInput({ value, onChange, min = 1, max = 9999, label = "Quantity", block = false }) {
  const [draft, setDraft] = useState(null);

  const clamp = (n) => Math.min(max, Math.max(min, n));

  const commit = () => {
    if (draft === null) return;
    const n = parseInt(draft, 10);
    setDraft(null);
    if (Number.isFinite(n) && n !== value) onChange(clamp(n));
  };

  return (
    <div className={`sb-stepper${block ? " sb-stepper--block" : ""}`} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min && min > 0} aria-label="Decrease quantity">
        <Minus size={15} aria-hidden="true" />
      </button>
      <input
        className="sb-stepper__input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 5))}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
        aria-label={label}
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label="Increase quantity">
        <Plus size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
