import { itemImage } from "../shop/shopLogic.js";

export const MIN_ORDER_VALUE = 99;
export const MAX_QTY = 9999;

export const deliveryFeeFor = (city) => (String(city).trim().toLowerCase() === "agra" ? 20 : 40);

export const discountedPrice = (price, percent) => (percent > 0 ? Math.round((price * (100 - percent)) / 100) : price);

export function lineKey(line) {
  return line.slug ? `${line.slug}|${line.variantLabel || ""}` : `name:${line.name}`;
}

export function resolveLines(cart, categories, percent) {
  const flat = categories.flatMap((c) => c.items.map((i) => ({ ...i, categoryLabel: c.label })));
  const bySlug = new Map(flat.map((p) => [p.slug, p]));
  const byName = new Map(flat.map((p) => [p.name, p]));

  return cart.map((line) => {
    let product = line.slug ? bySlug.get(line.slug) : byName.get(line.name);
    let label = line.variantLabel || null;
    if (!product && !line.slug) {
      const m = line.name.match(/^(.*) \((.+)\)$/);
      if (m && byName.get(m[1])) {
        product = byName.get(m[1]);
        label = m[2];
      }
    }
    const variants = product && Array.isArray(product.variants) ? product.variants : [];
    const variant = variants.length ? variants.find((v) => v.label === label) || null : null;
    const listPrice = variant ? Number(variant.price) : product ? Number(product.price) : 0;
    const stock = product && typeof product.stock === "number" && !product.isCustom ? product.stock : null;

    let problem = null;
    if (!product) problem = "This item is no longer available.";
    else if (variants.length && !variant) problem = "This option is no longer available.";
    else if (stock !== null && stock <= 0) problem = "Sold out.";
    else if (stock !== null && line.qty > stock) problem = `Only ${stock} left. Lower the quantity.`;

    return {
      rawKey: lineKey(line),
      slug: product ? product.slug : null,
      variantLabel: variant ? variant.label : null,
      name: variant && product ? `${product.name} (${variant.label})` : line.name,
      qty: line.qty,
      product,
      image: product ? itemImage(product) : null,
      listPrice,
      unit: discountedPrice(listPrice, percent),
      maxQty: stock === null ? MAX_QTY : Math.max(1, stock),
      problem,
    };
  });
}

export function summarize(lines, city) {
  const good = lines.filter((l) => !l.problem);
  const subtotal = good.reduce((n, l) => n + l.unit * l.qty, 0);
  const hasProblems = lines.some((l) => l.problem);
  const deliveryFee = city ? deliveryFeeFor(city) : null;
  return {
    subtotal,
    deliveryFee,
    total: subtotal + (deliveryFee ?? 0),
    hasProblems,
    meetsMinimum: subtotal >= MIN_ORDER_VALUE,
    shortBy: Math.max(0, MIN_ORDER_VALUE - subtotal),
  };
}

export function changeQty(setCart, rawKey, qty) {
  setCart((prev) => (qty <= 0 ? prev.filter((l) => lineKey(l) !== rawKey) : prev.map((l) => (lineKey(l) === rawKey ? { ...l, qty } : l))));
}

export function removeLine(setCart, rawKey) {
  setCart((prev) => prev.filter((l) => lineKey(l) !== rawKey));
}
