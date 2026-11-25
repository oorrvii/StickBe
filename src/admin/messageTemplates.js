// Messages the owner can copy or open in WhatsApp or email. Nothing is sent
// automatically, and payment details are never stored on the website.
export const PAYMENT_PLACEHOLDER = "[Add your payment details here]";

export const TEMPLATES = [
  { id: "approved", label: "Order approved, payment details" },
  { id: "paid", label: "Payment received" },
  { id: "processing", label: "Preparing the order" },
  { id: "dispatched", label: "Order dispatched" },
  { id: "delivered", label: "Order delivered" },
  { id: "rejected", label: "Request not accepted" },
  { id: "cancelled", label: "Order cancelled" },
];

export function defaultTemplate(statusId) {
  const map = { new: "approved", approved: "approved", paid: "paid", processing: "processing", dispatched: "dispatched", delivered: "delivered", rejected: "rejected", cancelled: "cancelled" };
  return map[statusId] || "approved";
}

export function buildMessage(id, order, shop = "StickBe") {
  const c = order.customer || {};
  const name = c.name || "there";
  const num = order.orderNumber || order.id;
  const sign = `\n\nThank you,\n${shop}`;
  const reason = order.cancelReason ? ` Reason: ${order.cancelReason}.` : "";
  switch (id) {
    case "approved":
      return `Hi ${name}, your order ${num} is approved. The total is ₹${order.total}.\n\nTo pay:\n${PAYMENT_PLACEHOLDER}\n\nPlease reply here with your payment confirmation and mention ${num}. We will confirm once we have verified it.${sign}`;
    case "paid":
      return `Hi ${name}, we have received your payment for order ${num}. Thank you! We will start preparing it now.${sign}`;
    case "processing":
      return `Hi ${name}, we are preparing your order ${num}. We will message you when it is on its way.${sign}`;
    case "dispatched": {
      const d = order.dispatch || {};
      const track = [d.trackingNumber ? `Tracking number: ${d.trackingNumber}` : "", d.trackingUrl ? `Track it here: ${d.trackingUrl}` : ""].filter(Boolean).join("\n");
      return `Hi ${name}, your order ${num} has been dispatched${d.courier ? ` with ${d.courier}` : ""}.${track ? `\n\n${track}` : ""}${sign}`;
    }
    case "delivered":
      return `Hi ${name}, your order ${num} has been delivered. We hope you love it! If anything is not right, reply here and we will help.${sign}`;
    case "rejected":
      return `Hi ${name}, we are sorry, we could not accept your order request ${num}.${reason} Nothing has been charged.${sign}`;
    case "cancelled":
      return `Hi ${name}, your order ${num} has been cancelled.${reason} If you already paid, we will sort out the refund with you.${sign}`;
    default:
      return "";
  }
}

export const hasPlaceholder = (text) => /\[[^\]]+\]/.test(text);

export function whatsappUrl(phone, text) {
  const digits = String(phone || "").replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? `https://wa.me/91${digits}?text=${encodeURIComponent(text)}` : null;
}

export function mailtoUrl(email, subject, text) {
  return email ? `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}` : null;
}

export function instagramUrl(handle) {
  const h = String(handle || "").replace(/^@/, "").trim();
  return /^[A-Za-z0-9._]{1,40}$/.test(h) ? `https://instagram.com/${h}` : null;
}
