// One rule for "is a sale running right now?". The server has its own copy
// (api/_lib/sale.js) with identical behaviour; tests/sale.test.mjs checks both.
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

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "30 November": the last day of the sale in India, or "" when the sale has no end date. */
export function saleEndLabel(sale) {
  const end = toMillis(sale && sale.endsAt);
  if (end === null) return "";
  const lastDay = new Date(end + 5.5 * 3600e3 - 1); // endsAt is midnight after the last day
  return `${lastDay.getUTCDate()} ${MONTHS[lastDay.getUTCMonth()]}`;
}

/** The sale headline, for example "Diwali sale, 30% off". The percent is exact: it applies to every item. */
export function saleHeadline(sale, percent) {
  const label = sale && typeof sale.label === "string" ? sale.label.trim() : "";
  return `${label || "Sale"}, ${percent}% off`;
}
