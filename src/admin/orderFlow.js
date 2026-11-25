// The order workflow, as plain functions. Nothing here touches Firebase, so the
// same rules run in the real admin, in tests and in the preview harness.
import { statusId } from "../app/orderUtils.js";

export class FlowError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const ACTIONS = {
  approve: { from: ["new"], to: "approved" },
  reject: { from: ["new"], to: "rejected" },
  verifyPayment: { from: ["approved"], to: "paid" },
  startProcessing: { from: ["paid"], to: "processing" },
  dispatch: { from: ["processing"], to: "dispatched" },
  deliver: { from: ["dispatched"], to: "delivered" },
  cancel: { from: ["approved", "paid", "processing"], to: "cancelled" },
};

export const CONTACT_METHODS = ["Phone call", "WhatsApp", "Instagram", "Email", "Other"];

const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const money = (v) => {
  const s = String(v ?? "").trim();
  return /^\d{1,7}$/.test(s) ? Number(s) : null;
};

function isHttps(url) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function need(reason, label) {
  const r = text(reason, 300);
  if (r.length < 3) throw new FlowError("REASON_REQUIRED", `Please give a reason ${label}.`);
  return r;
}

function line(status, message, now) {
  return { status, text: message, at: now };
}

/**
 * Applies one admin action. Returns the next order and private data, and whether
 * the items must go back into stock. Throws FlowError for anything invalid.
 */
export function applyAction(order, priv, action, payload = {}, now = Date.now()) {
  const rule = ACTIONS[action];
  if (!rule) throw new FlowError("UNKNOWN_ACTION", "That action is not available.");
  const current = statusId(order);
  if (!rule.from.includes(current)) {
    throw new FlowError("WRONG_STATE", "This order has already moved on. Refresh to see where it is now.");
  }

  const next = { ...order, status: rule.to };
  const nextPriv = { ...(priv || {}) };
  let message;
  let restoreStock = false;

  switch (action) {
    case "approve": {
      const shipping = money(payload.shippingCharge);
      if (shipping === null) throw new FlowError("BAD_SHIPPING", "Enter the shipping charge as a whole number. Use 0 for free shipping.");
      const final = money(payload.finalTotal);
      if (final === null) throw new FlowError("BAD_TOTAL", "Enter the final total as a whole number.");
      const expected = Number(order.subtotal) + shipping;
      let reason = null;
      if (final !== expected) reason = need(payload.adjustmentReason, "because the final total differs from items plus shipping");
      next.deliveryFee = shipping;
      next.total = final;
      next.adjustmentReason = reason;
      message = "Order request approved. Payment details will be sent to you by message.";
      break;
    }
    case "reject": {
      const reason = need(payload.reason, "for not accepting this request. The customer will see it");
      next.cancelReason = reason;
      restoreStock = true;
      message = `Your order request could not be accepted. Reason: ${reason}`;
      break;
    }
    case "verifyPayment": {
      if (payload.confirmed !== true) throw new FlowError("CONFIRM_REQUIRED", "Tick the box to confirm you checked your payment account.");
      nextPriv.paymentReference = text(payload.reference, 100);
      nextPriv.paymentVerifiedAt = now;
      message = "Payment verified. We will start preparing your order.";
      break;
    }
    case "startProcessing":
      message = "We are preparing your order.";
      break;
    case "dispatch": {
      const courier = text(payload.courier, 60);
      if (!courier) throw new FlowError("COURIER_REQUIRED", "Enter the courier name.");
      const url = text(payload.trackingUrl, 500);
      if (url) {
        if (!isHttps(url)) throw new FlowError("BAD_LINK", "The tracking link must be a full link starting with https://");
      }
      next.dispatch = { courier, trackingNumber: text(payload.trackingNumber, 80), trackingUrl: url };
      message = `Your order has been dispatched with ${courier}.`;
      break;
    }
    case "deliver":
      message = "Your order has been delivered.";
      break;
    case "cancel": {
      const reason = need(payload.reason, "for cancelling. The customer will see it");
      next.cancelReason = reason;
      restoreStock = true;
      message = `Your order was cancelled. Reason: ${reason}`;
      break;
    }
    default:
      break;
  }

  // Optional notes sent along with an action.
  if (typeof payload.customerNote === "string") next.customerNote = text(payload.customerNote, 500);
  if (typeof payload.internalNote === "string") nextPriv.internalNote = text(payload.internalNote, 1000);

  if (restoreStock) {
    if (order.stockRestored) restoreStock = false;
    else next.stockRestored = true;
  }
  next.history = [...(Array.isArray(order.history) ? order.history : []), line(rule.to, message, now)];
  next.updatedAt = now;
  return { order: next, priv: nextPriv, restoreStock };
}

export function applyNotes(order, priv, { customerNote, internalNote }, now = Date.now()) {
  return {
    order: { ...order, customerNote: text(customerNote, 500), updatedAt: now },
    priv: { ...(priv || {}), internalNote: text(internalNote, 1000) },
    restoreStock: false,
  };
}

export function applyContact(order, priv, { method, note }, now = Date.now()) {
  if (!CONTACT_METHODS.includes(method)) throw new FlowError("BAD_METHOD", "Choose how you contacted them.");
  const log = Array.isArray(priv?.contactLog) ? priv.contactLog : [];
  return { order, priv: { ...(priv || {}), contactLog: [...log, { method, note: text(note, 300), at: now }] }, restoreStock: false };
}

export function applyInstructionsSent(order, priv, now = Date.now()) {
  if (statusId(order) !== "approved") throw new FlowError("WRONG_STATE", "Payment instructions can be recorded once the order is approved.");
  const log = Array.isArray(priv?.contactLog) ? priv.contactLog : [];
  return {
    order,
    priv: { ...(priv || {}), paymentInstructionsSentAt: now, contactLog: [...log, { method: "Payment instructions", note: "Sent to the customer", at: now }] },
    restoreStock: false,
  };
}

/** How many of each product go back into stock when an order is cancelled or rejected. */
export function stockReturns(order) {
  const back = new Map();
  for (const i of order.items || []) {
    if (i.isCustom || !i.slug) continue;
    back.set(i.slug, (back.get(i.slug) || 0) + Number(i.qty || 0));
  }
  return back;
}

export function contactSummary(priv, fmt) {
  const log = Array.isArray(priv?.contactLog) ? priv.contactLog.filter((c) => c.method !== "Payment instructions") : [];
  if (log.length === 0) return "Not contacted yet";
  const last = log[log.length - 1];
  return `Last contacted by ${last.method} on ${fmt(last.at)}`;
}

/** Compares an order's lines with the current catalogue. */
export function catalogCheck(order, products) {
  const issues = [];
  for (const i of order.items || []) {
    if (i.isCustom) continue;
    const p = products.find((x) => x.slug === i.slug);
    if (!p) {
      issues.push(`${i.name} is no longer in the catalogue.`);
      continue;
    }
    const variants = Array.isArray(p.variants) ? p.variants : [];
    const v = variants.find((x) => i.variantLabel && x.label === i.variantLabel);
    const now = v ? Number(v.price) : Number(p.price);
    if (Number.isFinite(now) && now !== Number(i.listPrice ?? i.price)) issues.push(`${i.name}: price is now ₹${now} (the order has ₹${i.listPrice ?? i.price}).`);
  }
  return issues;
}

function csvCell(v) {
  let s = v === undefined || v === null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stops spreadsheet formulas from running
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ordersToCsv(orders, labelOf, fmt) {
  const head = ["Order number", "Placed", "Status", "Name", "Phone", "Email", "Instagram", "Address", "City", "State", "PIN", "Items", "Subtotal", "Delivery", "Total", "Discount %", "Customer note", "Courier", "Tracking number"];
  const rows = orders.map((o) => {
    const c = o.customer || {};
    return [
      o.orderNumber || o.id, o.createdAt ? fmt(o.createdAt) : "", labelOf(o), c.name, c.phone, c.email, c.instagram,
      c.address, c.city, c.state, c.pincode,
      (o.items || []).map((i) => `${i.name} x ${i.qty}`).join("; "),
      o.subtotal, o.deliveryFee, o.total, o.discountPercent ?? 0, o.note, o.dispatch?.courier, o.dispatch?.trackingNumber,
    ];
  });
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}
