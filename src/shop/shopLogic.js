import { itemImage, isAvailable } from "../site/heroPhotos.js";

export { itemImage, isAvailable };

export const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "name", label: "Name: A to Z" },
];

export function discountedPrice(price, percent) {
  return percent > 0 ? Math.round((price * (100 - percent)) / 100) : price;
}

export function priceInfo(item, percent) {
  const variants = Array.isArray(item.variants) ? item.variants.filter((v) => v && Number.isFinite(Number(v.price))) : [];
  const hasVariants = variants.length > 0;
  const original = hasVariants ? Math.min(...variants.map((v) => Number(v.price))) : Number(item.price);
  const listPrice = Number(item.originalPrice);
  // A permanent "was" price set on the product; a running sale takes over when there is one.
  const showWas = !hasVariants && !(percent > 0) && Number.isFinite(listPrice) && listPrice > original;
  if (showWas) return { from: false, original: listPrice, current: original, hasDiscount: true };
  return {
    from: hasVariants,
    original,
    current: discountedPrice(original, percent),
    hasDiscount: percent > 0,
  };
}

export function stockNote(item) {
  if (!isAvailable(item)) return { tone: "danger", text: "Sold out" };
  if (typeof item.stock === "number" && item.stock <= (typeof item.lowStockAt === "number" ? item.lowStockAt : 5)) return { tone: "warning", text: `Only ${item.stock} left` };
  return null;
}

export function filterItems(items, { query, inStockOnly }) {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    const matchesQuery =
      !q || item.name.toLowerCase().includes(q) || (item.categoryLabel || "").toLowerCase().includes(q);
    return matchesQuery && (!inStockOnly || isAvailable(item));
  });
}

export function sortItems(items, sortId, percent) {
  const list = [...items];
  if (sortId === "price-asc") return list.sort((a, b) => priceInfo(a, percent).current - priceInfo(b, percent).current);
  if (sortId === "price-desc") return list.sort((a, b) => priceInfo(b, percent).current - priceInfo(a, percent).current);
  if (sortId === "name") return list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

export function pageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

/** Which soft backdrop tint (0 to 4) a product photo sits on. Same category, same tint. */
export function toneOf(item) {
  const key = String((item && item.category) || "");
  let sum = 0;
  for (let i = 0; i < key.length; i += 1) sum += key.charCodeAt(i);
  return sum % 5;
}
