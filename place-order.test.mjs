import assert from "node:assert/strict";
import { createHandler } from "../api/place-order.js";

function fakeDb(products) {
  const orders = new Map();
  let n = 0;
  const store = { products: new Map(Object.entries(products)), orders };
  const snap = (data) => ({ exists: data !== undefined, data: () => data });
  const db = {
    store,
    doc: (path) => ({ path }),
    collection: (name) => ({
      doc: () => ({ path: `${name}/id${String(++n).padStart(8, "0")}ABCDE`, id: `id${String(n).padStart(8, "0")}ABCDE` }),
      where: (f, _op, v) => ({
        limit: () => ({
          get: async () => {
            const docs = [...orders.entries()].filter(([, o]) => o[f] === v).map(([id, o]) => ({ id, data: () => o }));
            return { empty: docs.length === 0, docs };
          },
        }),
      }),
    }),
    runTransaction: async (fn) => {
      const writes = [];
      const t = {
        get: async (ref) => snap(store.products.get(ref.path.split("/")[1])),
        update: (ref, d) => writes.push(() => Object.assign(store.products.get(ref.path.split("/")[1]), d)),
        set: (ref, d) => writes.push(() => orders.set(ref.id, d)),
      };
      const out = await fn(t);
      writes.forEach((w) => w());
      return out;
    },
  };
  return db;
}

const baseProducts = () => ({
  panda: { name: "Panda Set", price: 70, stock: 5 },
  mug: { name: "Mug", price: 10, stock: 1 },
  pack: { name: "Pack", price: 70, variants: [{ label: "Small", price: 50 }, { label: "Large", price: 90 }] },
  custom: { name: "Custom Sticker", price: 100, isCustom: true, stock: 0 },
});
const customer = { name: "Asha Verma", email: "A@B.com", phone: "+91 98765 43210", instagram: "@asha.v", address1: "12 MG Road", city: "Agra", state: "Uttar Pradesh", pincode: "282001" };

async function call(db, body, headers = {}, verify) {
  let status = 200, json;
  const res = { setHeader() {}, status(s) { status = s; return this; }, json(j) { json = j; return this; } };
  await createHandler({ getDb: () => db, verifyToken: verify || (async () => ({ uid: "u1" })) })({ method: "POST", headers, body }, res);
  return { status, json };
}
const good = (over = {}) => ({ items: [{ slug: "panda", qty: 2 }], customer, discountPercent: 0, requestId: "req-12345678", ...over });

let db = fakeDb(baseProducts());
let r = await call(db, good());
assert.equal(r.status, 200); assert.equal(r.json.order.subtotal, 140); assert.equal(r.json.order.deliveryFee, 20); assert.equal(r.json.order.total, 160);
assert.equal(db.store.products.get("panda").stock, 3, "stock decremented");
assert.equal(r.json.order.customer.phone, "9876543210"); assert.equal(r.json.order.customer.instagram, "asha.v"); assert.equal(r.json.order.userId, null);
assert.match(r.json.orderNumber, /^SB-\d{6}-[A-Z0-9]{5}$/);
console.log("ok: basic order, Agra fee, stock, normalisation");

r = await call(db, good());
assert.equal(r.json.duplicate, true); assert.equal(db.store.products.get("panda").stock, 3, "no second decrement");
console.log("ok: double submit is idempotent");

db = fakeDb(baseProducts());
r = await call(db, good({ items: [{ slug: "panda", qty: 99 }], requestId: "req-22222222" })); assert.equal(r.status, 409); assert.equal(r.json.error, "OUT_OF_STOCK");
r = await call(db, good({ items: [{ slug: "mug", qty: 1 }], requestId: "req-33333333" })); assert.equal(r.json.error, "BELOW_MINIMUM");
r = await call(db, good({ items: [{ slug: "nope", qty: 1 }], requestId: "req-44444444" })); assert.equal(r.json.error, "ITEM_UNAVAILABLE");
r = await call(db, good({ items: [{ slug: "pack", qty: 1 }], requestId: "req-55555555" })); assert.equal(r.json.error, "ITEM_UNAVAILABLE", "variant required");
r = await call(db, good({ items: [{ slug: "pack", variantLabel: "Large", qty: 2 }], requestId: "req-66666666", customer: { ...customer, city: "Delhi", state: "Delhi" } }));
assert.equal(r.status, 200); assert.equal(r.json.order.items[0].price, 90); assert.equal(r.json.order.deliveryFee, 40); assert.equal(r.json.order.total, 220);
console.log("ok: stock, minimum, unknown item, variants, non-Agra fee");

db = fakeDb(baseProducts());
r = await call(db, good({ items: [{ slug: "panda", qty: 2 }], clientPrice: 1, requestId: "req-77777777" })); assert.equal(r.json.order.total, 160, "client prices are ignored");
r = await call(db, good({ discountPercent: 10, requestId: "req-88888888" })); assert.equal(r.json.error, "PRICES_CHANGED");
r = await call(db, good({ expectedTotal: 1, requestId: "req-99999999" })); assert.equal(r.json.error, "PRICES_CHANGED"); assert.equal(r.json.total, 160);
console.log("ok: tampered prices rejected");

r = await call(db, good({ customer: { ...customer, phone: "12", instagram: "", state: "Narnia" }, requestId: "req-10101010" }));
assert.equal(r.status, 422); assert.deepEqual(Object.keys(r.json.problems).sort(), ["instagram", "phone", "state"]);
console.log("ok: server-side validation (instagram required)");

r = await call(db, good({ requestId: "req-20202020" }), { authorization: "Bearer tok" }); assert.equal(r.json.order.userId, "u1");
r = await call(db, good({ requestId: "req-30303030" }), { authorization: "Bearer bad" }, async () => { throw new Error("x"); }); assert.equal(r.status, 401);
let m = { status: 0 }; await createHandler({ getDb: () => db })({ method: "GET", headers: {}, body: null }, { setHeader() {}, status(s) { m.status = s; return this; }, json() {} }); assert.equal(m.status, 405);
console.log("ok: login linked from verified token only; bad token 401; GET 405");

db = fakeDb(baseProducts());
r = await call(db, good({ items: [{ slug: "custom", qty: 1 }], requestId: "req-40404040" })); assert.equal(r.status, 200); assert.equal(db.store.products.get("custom").stock, 0, "custom items skip stock");
console.log("all server tests passed");
