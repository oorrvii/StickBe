// Everything the admin reads and writes about products, categories, pages and
// site settings. Each write is small and explicit; nothing is ever deleted.
import { collection, doc, getDoc, getDocs, runTransaction, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export class CatalogError extends Error {}

export function createFirestoreCatalogService(database = db) {
  const productRef = (slug) => doc(database, "products", slug);
  return {
    async listProducts() {
      const snap = await getDocs(collection(database, "products"));
      return snap.docs.map((d) => ({ ...d.data(), slug: d.data().slug || d.id, id: d.id }));
    },
    async getProduct(slug) {
      const snap = await getDoc(productRef(slug));
      return snap.exists() ? { ...snap.data(), slug: snap.data().slug || snap.id, id: snap.id } : null;
    },
    async saveProduct(data, { isNew }) {
      const now = Date.now();
      await runTransaction(database, async (t) => {
        const snap = await t.get(productRef(data.slug));
        if (isNew && snap.exists()) throw new CatalogError("Another product already uses this slug.");
        if (!isNew && !snap.exists()) throw new CatalogError("That product no longer exists.");
        t.set(productRef(data.slug), isNew ? { ...data, createdAt: now, updatedAt: now } : { ...data, updatedAt: now }, { merge: true });
      });
    },
    async setProductStatus(slug, status) {
      await setDoc(productRef(slug), { status, updatedAt: Date.now() }, { merge: true });
    },
    // A transaction, so an order placed at the same moment cannot be overwritten.
    async setStock(slug, stock) {
      await runTransaction(database, async (t) => {
        const snap = await t.get(productRef(slug));
        if (!snap.exists()) throw new CatalogError("That product no longer exists.");
        t.update(productRef(slug), { stock, updatedAt: Date.now() });
      });
    },
    async listCategories() {
      const snap = await getDocs(collection(database, "categories"));
      return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
    },
    async saveCategory(id, data) {
      await setDoc(doc(database, "categories", id), { ...data, updatedAt: Date.now() }, { merge: true });
    },
    async listPages() {
      const snap = await getDocs(collection(database, "pages"));
      return snap.docs.map((d) => ({ ...d.data(), slug: d.id }));
    },
    async getPage(slug) {
      const snap = await getDoc(doc(database, "pages", slug));
      return snap.exists() ? { ...snap.data(), slug } : null;
    },
    async savePage(slug, data) {
      await setDoc(doc(database, "pages", slug), { ...data, updatedAt: Date.now() }, { merge: true });
    },
    async getSettings() {
      const snap = await getDoc(doc(database, "settings", "site"));
      return snap.exists() ? snap.data() : {};
    },
    async saveSettings(data) {
      await setDoc(doc(database, "settings", "site"), { ...data, updatedAt: Date.now() }, { merge: true });
    },
  };
}
