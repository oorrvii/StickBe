export const ORDER_STATUS = {
  new: { label: "Order received", tone: "lavender" },
  fulfilled: { label: "Fulfilled", tone: "success" },
};

export function statusOf(order) {
  return ORDER_STATUS[order.status || "new"] || ORDER_STATUS.new;
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
