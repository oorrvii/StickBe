// Order statuses shared by the customer pages and the admin pages.
// `fulfilled` is the old two-state status; it is shown as Delivered.
export const ORDER_STATUS = {
  new: { label: "Order request received", tone: "lavender", payment: "Payment not requested yet" },
  approved: { label: "Approved, payment pending", tone: "terracotta", payment: "Awaiting payment" },
  rejected: { label: "Request not accepted", tone: "danger", payment: "No payment needed" },
  paid: { label: "Payment verified", tone: "sage", payment: "Payment verified" },
  processing: { label: "Processing", tone: "violet", payment: "Payment verified" },
  dispatched: { label: "Dispatched", tone: "violet", payment: "Payment verified" },
  delivered: { label: "Delivered", tone: "success", payment: "Payment verified" },
  cancelled: { label: "Cancelled", tone: "danger", payment: "No payment needed" },
};

export const STATUS_ORDER = Object.keys(ORDER_STATUS);

/** The status id for an order, with the old `fulfilled` mapped to `delivered`. */
export function statusId(order) {
  const s = order?.status || "new";
  if (s === "fulfilled") return "delivered";
  return ORDER_STATUS[s] ? s : "new";
}

export function statusOf(order) {
  return ORDER_STATUS[statusId(order)];
}

export function orderNumber(order) {
  const d = new Date(order.createdAt || Date.now());
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `SB-${yy}${mm}${dd}-${order.id.slice(-5).toUpperCase()}`;
}

export function formatOrderDate(ms) {
  return new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * What the customer sees as the order's history. New orders carry their own
 * `history`; older ones get a short one made from their status.
 */
export function historyOf(order) {
  if (Array.isArray(order.history) && order.history.length > 0) return order.history;
  const out = [{ status: "new", text: "Order request received", at: order.createdAt || null }];
  if (statusId(order) === "delivered") out.push({ status: "delivered", text: "Your order has been delivered.", at: null });
  return out;
}
