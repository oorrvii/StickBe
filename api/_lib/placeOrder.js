import { activeSalePercent } from "./sale.js";
import { OrderError, deliveryFeeFor, normalizeItems, priceOrder, validateCustomer } from "./pricing.js";

export function orderNumberFor(id, createdAt) {
  const d = new Date(createdAt);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `SB-${yy}${mm}${dd}-${id.slice(-5).toUpperCase()}`;
}

export async function placeOrder({ db, body, uid, now = Date.now() }) {
  if (!body || typeof body !== "object") throw new OrderError(400, "BAD_REQUEST", "Invalid request.");
  const requestId = typeof body.requestId === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.requestId) ? body.requestId : null;
  const customer = validateCustomer(body.customer);
  const items = normalizeItems(body.items);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

  if (requestId) {
    const existing = await db.collection("orders").where("requestId", "==", requestId).limit(1).get();
    if (!existing.empty) {
      const doc = existing.docs[0];
      const data = doc.data();
      return { orderId: doc.id, orderNumber: data.orderNumber, order: { ...data, id: doc.id }, duplicate: true };
    }
  }

  return db.runTransaction(async (t) => {
    const slugs = [...new Set(items.map((i) => i.slug))];
    const settingsSnap = await t.get(db.doc("settings/site"));
    const discountPercent = activeSalePercent(settingsSnap.exists ? settingsSnap.data().sale : null, now);
    if (Number(body.discountPercent) !== discountPercent) {
      throw new OrderError(409, "PRICES_CHANGED", "Our prices were just updated. Please review your cart.");
    }
    const snaps = await Promise.all(slugs.map((s) => t.get(db.doc(`products/${s}`))));
    const products = new Map();
    snaps.forEach((snap, i) => {
      if (snap.exists) products.set(slugs[i], snap.data());
    });

    const { lines, subtotal, stockUse } = priceOrder({ items, products, discountPercent });
    const deliveryFee = deliveryFeeFor(customer.city);
    const total = subtotal + deliveryFee;

    if (body.expectedTotal !== undefined && Number(body.expectedTotal) !== total) {
      throw new OrderError(409, "PRICES_CHANGED", "The total changed since you last looked. Please review your order.", { total });
    }

    for (const [slug, used] of stockUse) {
      t.update(db.doc(`products/${slug}`), { stock: products.get(slug).stock - used });
    }

    const ref = db.collection("orders").doc();
    const orderNumber = orderNumberFor(ref.id, now);
    const order = {
      orderNumber,
      requestId,
      items: lines,
      subtotal,
      deliveryFee,
      discountPercent,
      total,
      customer,
      note,
      userId: uid || null,
      status: "new",
      history: [{ status: "new", text: "Order request received", at: now }],
      createdAt: now,
    };
    t.set(ref, order);
    return { orderId: ref.id, orderNumber, order: { ...order, id: ref.id }, duplicate: false };
  });
}
