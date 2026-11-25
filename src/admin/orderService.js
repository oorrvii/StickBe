// The only file in the admin that talks to Firestore about orders. Every change
// is one transaction, so two clicks (or two devices) cannot both succeed.
import { collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, where } from "firebase/firestore";
import { db } from "../firebase";
import { FlowError, applyAction, applyContact, applyInstructionsSent, applyNotes, stockReturns } from "./orderFlow.js";

const PRIVATE_DOC = "admin"; // orders/{id}/private/admin: notes and payment details only the owner can read

const strip = ({ id: _id, ...rest }) => rest; // eslint-disable-line no-unused-vars

export function createFirestoreOrderService(database = db) {
  const orderRef = (id) => doc(database, "orders", id);
  const privRef = (id) => doc(database, "orders", id, "private", PRIVATE_DOC);

  async function mutate(orderId, change) {
    return runTransaction(database, async (t) => {
      const snap = await t.get(orderRef(orderId));
      if (!snap.exists()) throw new FlowError("NOT_FOUND", "That order no longer exists.");
      const privSnap = await t.get(privRef(orderId));
      const order = { id: snap.id, ...snap.data() };
      const priv = privSnap.exists() ? privSnap.data() : {};
      const out = change(order, priv, Date.now());

      // All reads first, then writes.
      const back = out.restoreStock ? stockReturns(order) : new Map();
      const restores = [];
      for (const [slug, qty] of back) {
        const pSnap = await t.get(doc(database, "products", slug));
        if (pSnap.exists() && typeof pSnap.data().stock === "number") restores.push([slug, pSnap.data().stock + qty]);
      }
      t.set(orderRef(orderId), strip(out.order));
      t.set(privRef(orderId), out.priv);
      for (const [slug, stock] of restores) t.update(doc(database, "products", slug), { stock });
      return { order: out.order, priv: out.priv };
    });
  }

  return {
    async listOrders() {
      const snap = await getDocs(query(collection(database, "orders"), orderBy("createdAt", "desc")));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    async getOrder(ref) {
      let snap = null;
      const byNumber = await getDocs(query(collection(database, "orders"), where("orderNumber", "==", ref), limit(1)));
      if (!byNumber.empty) snap = byNumber.docs[0];
      else {
        const byId = await getDoc(orderRef(ref));
        if (byId.exists()) snap = byId;
      }
      if (!snap) return null;
      const privSnap = await getDoc(privRef(snap.id));
      return { order: { id: snap.id, ...snap.data() }, priv: privSnap.exists() ? privSnap.data() : {} };
    },
    act: (id, action, payload) => mutate(id, (o, p, now) => applyAction(o, p, action, payload, now)),
    saveNotes: (id, notes) => mutate(id, (o, p, now) => applyNotes(o, p, notes, now)),
    recordContact: (id, contact) => mutate(id, (o, p, now) => applyContact(o, p, contact, now)),
    markInstructionsSent: (id) => mutate(id, (o, p, now) => applyInstructionsSent(o, p, now)),
  };
}
