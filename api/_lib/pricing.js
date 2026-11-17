import { DELIVERY_FEE_AGRA, DELIVERY_FEE_DEFAULT, MAX_LINES, MAX_QTY, MIN_ORDER_VALUE } from "./config.js";
import { INDIAN_STATES } from "./states.js";

export class OrderError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function discounted(price, percent) {
  return percent > 0 ? Math.round((price * (100 - percent)) / 100) : price;
}

export function deliveryFeeFor(city) {
  return String(city).trim().toLowerCase() === "agra" ? DELIVERY_FEE_AGRA : DELIVERY_FEE_DEFAULT;
}

const str = (v) => (typeof v === "string" ? v.trim() : "");

function phoneDigits(v) {
  const d = str(v).replace(/\D/g, "");
  return d.length === 12 && d.startsWith("91") ? d.slice(2) : d;
}

export function validateCustomer(raw) {
  const c = raw && typeof raw === "object" ? raw : {};
  const customer = {
    name: str(c.name),
    email: str(c.email).toLowerCase(),
    phone: phoneDigits(c.phone),
    altPhone: phoneDigits(c.altPhone),
    instagram: str(c.instagram).replace(/^@/, ""),
    address1: str(c.address1),
    address2: str(c.address2),
    landmark: str(c.landmark),
    city: str(c.city),
    state: str(c.state),
    pincode: str(c.pincode),
    country: "India",
  };
  const problems = {};
  if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(customer.name)) problems.name = "Enter your full name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customer.email) || customer.email.length > 120) problems.email = "Enter a valid email";
  if (!/^\d{10}$/.test(customer.phone)) problems.phone = "Enter a 10-digit mobile number";
  if (customer.altPhone && !/^\d{10}$/.test(customer.altPhone)) problems.altPhone = "Enter a 10-digit number";
  if (!/^[A-Za-z0-9._]{1,40}$/.test(customer.instagram)) problems.instagram = "Enter your Instagram username";
  if (!customer.address1 || customer.address1.length > 150) problems.address1 = "Enter your house or flat number and street";
  if (customer.address2.length > 150) problems.address2 = "Too long";
  if (customer.landmark.length > 150) problems.landmark = "Too long";
  if (!/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(customer.city)) problems.city = "Enter your city or town";
  if (!INDIAN_STATES.includes(customer.state)) problems.state = "Choose a state";
  if (!/^\d{6}$/.test(customer.pincode)) problems.pincode = "Enter a 6-digit PIN code";
  if (Object.keys(problems).length) throw new OrderError(422, "INVALID_DETAILS", "Please check your details.", { problems });
  customer.address = [customer.address1, customer.address2, customer.landmark].filter(Boolean).join(", ");
  return customer;
}

export function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new OrderError(422, "EMPTY_CART", "Your cart is empty.");
  if (rawItems.length > MAX_LINES) throw new OrderError(422, "TOO_MANY_LINES", "Too many different items in one order.");
  const merged = new Map();
  for (const it of rawItems) {
    const slug = str(it?.slug);
    const variantLabel = it?.variantLabel ? str(it.variantLabel) : null;
    const qty = Number(it?.qty);
    if (!slug || slug.includes("/") || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new OrderError(422, "BAD_ITEM", "One of the items in your cart is invalid. Please refresh your cart.");
    }
    const key = `${slug}|${variantLabel || ""}`;
    const prev = merged.get(key);
    merged.set(key, { slug, variantLabel, qty: (prev?.qty || 0) + qty });
  }
  return [...merged.values()];
}

export function priceOrder({ items, products, discountPercent }) {
  const lines = [];
  const stockUse = new Map();
  for (const item of items) {
    const p = products.get(item.slug);
    if (!p) throw new OrderError(409, "ITEM_UNAVAILABLE", "An item in your cart is no longer available.", { slug: item.slug });
    const variants = Array.isArray(p.variants) ? p.variants : [];
    let base;
    let name = p.name;
    if (variants.length > 0) {
      const v = variants.find((x) => x.label === item.variantLabel);
      if (!v) throw new OrderError(409, "ITEM_UNAVAILABLE", `Please choose an option for ${p.name}.`, { slug: item.slug });
      base = Number(v.price);
      name = `${p.name} (${v.label})`;
    } else {
      base = Number(p.price);
    }
    if (!Number.isFinite(base) || base < 0) throw new OrderError(409, "ITEM_UNAVAILABLE", "An item in your cart can't be ordered right now.", { slug: item.slug });
    const unit = discounted(base, discountPercent);
    lines.push({ slug: item.slug, variantLabel: item.variantLabel || null, name, qty: item.qty, listPrice: base, price: unit, isCustom: !!p.isCustom });
    if (typeof p.stock === "number" && !p.isCustom) stockUse.set(item.slug, (stockUse.get(item.slug) || 0) + item.qty);
  }
  for (const [slug, used] of stockUse) {
    const stock = products.get(slug).stock;
    if (used > stock) {
      const name = products.get(slug).name;
      throw new OrderError(409, "OUT_OF_STOCK", stock > 0 ? `Only ${stock} of ${name} left.` : `${name} is sold out.`, { slug, available: stock });
    }
  }
  const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
  if (subtotal < MIN_ORDER_VALUE) throw new OrderError(422, "BELOW_MINIMUM", `The minimum order is ₹${MIN_ORDER_VALUE}.`);
  return { lines, subtotal, stockUse };
}
