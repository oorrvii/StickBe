// Server copy of src/site/saleLogic.js. Keep the two identical; tests/sale.test.mjs checks they agree.
export const MAX_SALE_PERCENT = 90;

export const DEFAULT_SALE = { active: false, percent: 0, label: "", startsAt: "", endsAt: "" };

function toMillis(v) {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object" && typeof v.toMillis === "function") return v.toMillis();
  if (typeof v === "object" && typeof v.seconds === "number") return v.seconds * 1000;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

/** The discount percent in force at `now` (0 when there is no sale). */
export function activeSalePercent(sale, now) {
  if (!sale || typeof sale !== "object" || sale.active !== true) return 0;
  const percent = Math.round(Number(sale.percent));
  if (!Number.isFinite(percent) || percent < 1) return 0;
  const start = toMillis(sale.startsAt);
  const end = toMillis(sale.endsAt);
  if (start !== null && now < start) return 0;
  if (end !== null && now >= end) return 0;
  return Math.min(percent, MAX_SALE_PERCENT);
}

export function cleanSale(remote) {
  if (!remote || typeof remote !== "object") return { ...DEFAULT_SALE };
  return {
    active: remote.active === true,
    percent: Number(remote.percent) || 0,
    label: typeof remote.label === "string" ? remote.label.trim().slice(0, 60) : "",
    startsAt: remote.startsAt ?? "",
    endsAt: remote.endsAt ?? "",
  };
}
