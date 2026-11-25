// In-memory catalogue service for tests and the preview harness.
import { CatalogError } from "./catalogService.js";

export function createMemoryCatalogService({ products = [], categories = [], pages = [], settings = {} } = {}) {
  const P = new Map(products.map((p) => [p.slug, { ...p, id: p.slug }]));
  const C = new Map(categories.map((c) => [c.id, c]));
  const G = new Map(pages.map((p) => [p.slug, p]));
  let S = { ...settings };
  const wait = () => new Promise((r) => setTimeout(r, 0));
  return {
    async listProducts() { await wait(); return [...P.values()]; },
    async getProduct(slug) { await wait(); return P.get(slug) || null; },
    async saveProduct(data, { isNew }) {
      await wait();
      if (isNew && P.has(data.slug)) throw new CatalogError("Another product already uses this slug.");
      if (!isNew && !P.has(data.slug)) throw new CatalogError("That product no longer exists.");
      P.set(data.slug, { ...(P.get(data.slug) || {}), ...data, id: data.slug });
    },
    async setProductStatus(slug, status) { await wait(); P.set(slug, { ...P.get(slug), status }); },
    async setStock(slug, stock) { await wait(); if (!P.has(slug)) throw new CatalogError("That product no longer exists."); P.set(slug, { ...P.get(slug), stock }); },
    async listCategories() { await wait(); return [...C.values()]; },
    async saveCategory(id, data) { await wait(); C.set(id, { ...(C.get(id) || {}), ...data, id }); },
    async listPages() { await wait(); return [...G.values()]; },
    async getPage(slug) { await wait(); return G.get(slug) || null; },
    async savePage(slug, data) { await wait(); G.set(slug, { ...(G.get(slug) || {}), ...data, slug, updatedAt: Date.now() }); },
    async getSettings() { await wait(); return S; },
    async saveSettings(data) { await wait(); S = { ...S, ...data }; },
  };
}
