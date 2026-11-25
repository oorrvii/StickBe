// Categories come from the built-in list plus anything saved in the `categories`
// collection. A saved document with the same id overrides the built-in one, so
// nothing is lost if the collection is empty or cannot be read.
export const DEFAULT_ICON = "sticker";

const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function mergeCategories(meta, remote = []) {
  const byId = new Map(
    meta.map((m, i) => [m.id, { ...m, description: "", image: "", order: (i + 1) * 10, active: true, showOnHome: true, builtIn: true }])
  );
  for (const doc of remote) {
    if (!doc || typeof doc.id !== "string" || !doc.id) continue;
    const base = byId.get(doc.id) || { id: doc.id, label: doc.id, icon: DEFAULT_ICON, description: "", image: "", order: 1000, active: true, showOnHome: true, builtIn: false };
    byId.set(doc.id, {
      ...base,
      label: clean(doc.label, 60) || base.label,
      description: clean(doc.description, 400) || base.description,
      image: clean(doc.image, 300) || base.image,
      icon: clean(doc.icon, 30) || base.icon,
      order: Number.isFinite(Number(doc.order)) && doc.order !== "" && doc.order !== null ? Number(doc.order) : base.order,
      active: doc.active === false ? false : base.active,
      showOnHome: doc.showOnHome === false ? false : base.showOnHome,
    });
  }
  return [...byId.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

export const isLive = (p) => !p.status || p.status === "published";
