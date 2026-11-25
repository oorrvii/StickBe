// Turning a product into form values and back, with every rule in one place.
export const STATUSES = [
  { id: "published", label: "Published" },
  { id: "draft", label: "Draft (hidden)" },
  { id: "archived", label: "Archived (hidden)" },
];
export const DEFAULT_LOW_STOCK = 5;

export function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const statusOfProduct = (p) => (p.status === "draft" || p.status === "archived" ? p.status : "published");

export function emptyProduct(categoryId) {
  return {
    name: "", slug: "", category: categoryId || "", description: "", careInstructions: "",
    price: "", originalPrice: "", stock: "", lowStockAt: String(DEFAULT_LOW_STOCK), inStock: true,
    hasVariants: false, variants: [{ label: "", price: "" }], image: "", extraImages: [], order: "0", status: "draft",
  };
}

export function productToForm(p) {
  const images = Array.isArray(p.images) ? p.images : [];
  const cover = p.image || images[0] || "";
  const extra = (images.length ? images : []).filter((i) => i && i !== cover);
  const variants = Array.isArray(p.variants) && p.variants.length ? p.variants.map((v) => ({ label: v.label || "", price: String(v.price ?? "") })) : [{ label: "", price: "" }];
  return {
    ...emptyProduct(p.category),
    name: p.name || "", slug: p.slug || "", category: p.category || "", description: p.description || "", careInstructions: p.careInstructions || "",
    price: p.price === undefined || p.price === null ? "" : String(p.price),
    originalPrice: p.originalPrice ? String(p.originalPrice) : "",
    stock: typeof p.stock === "number" ? String(p.stock) : "",
    lowStockAt: typeof p.lowStockAt === "number" ? String(p.lowStockAt) : String(DEFAULT_LOW_STOCK),
    inStock: p.inStock !== false,
    hasVariants: Array.isArray(p.variants) && p.variants.length > 0,
    variants, image: cover, extraImages: extra,
    order: String(p.order ?? 0), status: statusOfProduct(p),
  };
}

const int = (s, { min = 0, max = 1000000 } = {}) => {
  const t = String(s ?? "").trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= min && n <= max ? n : null;
};

/** Returns { errors } or { data }. `ctx.isNew`, `ctx.takenSlugs`, `ctx.categoryIds`. */
export function validateProduct(form, ctx) {
  const errors = {};
  const name = form.name.trim();
  if (!name) errors.name = "Enter a name.";
  else if (name.length > 100) errors.name = "Keep the name under 100 characters.";

  const slug = form.slug.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) errors.slug = "Use lowercase letters, numbers and single dashes, for example cute-cat-sticker.";
  else if (ctx.isNew && ctx.takenSlugs.includes(slug)) errors.slug = "Another product already uses this slug.";

  if (!ctx.categoryIds.includes(form.category)) errors.category = "Choose a category.";

  let variants = null;
  let price;
  if (form.hasVariants) {
    const rows = form.variants.filter((v) => v.label.trim() || String(v.price).trim());
    const parsed = rows.map((v) => ({ label: v.label.trim().slice(0, 60), price: int(v.price) }));
    if (parsed.length === 0 || parsed.some((v) => !v.label || v.price === null)) errors.variants = "Every option needs a name and a price in whole rupees.";
    else if (new Set(parsed.map((v) => v.label.toLowerCase())).size !== parsed.length) errors.variants = "Option names must be different from each other.";
    else {
      variants = parsed;
      price = Math.min(...parsed.map((v) => v.price));
    }
  } else {
    price = int(form.price);
    if (price === null) errors.price = "Enter the price in whole rupees.";
  }

  let originalPrice = null;
  if (String(form.originalPrice).trim() !== "") {
    originalPrice = int(form.originalPrice);
    if (originalPrice === null) errors.originalPrice = "Enter the original price in whole rupees.";
    else if (price !== undefined && !errors.price && originalPrice <= price) errors.originalPrice = "The original price must be higher than the selling price.";
  }

  let stock = null;
  if (String(form.stock).trim() !== "") {
    stock = int(form.stock, { max: 1000000 });
    if (stock === null) errors.stock = "Stock must be a whole number, or leave it empty if you don't track it.";
  }
  const lowStockAt = int(form.lowStockAt, { max: 9999 });
  if (lowStockAt === null) errors.lowStockAt = "Enter a whole number.";
  const order = int(form.order, { max: 99999 });
  if (order === null) errors.order = "Enter a whole number, 0 or more.";

  if (!form.image.trim()) errors.image = "Choose a cover photo.";
  if (!STATUSES.some((s) => s.id === form.status)) errors.status = "Choose a status.";
  if (form.description.length > 2000) errors.description = "Keep the description under 2000 characters.";
  if (form.careInstructions.length > 1000) errors.careInstructions = "Keep this under 1000 characters.";

  if (Object.keys(errors).length) return { errors };
  const extra = [...new Set(form.extraImages.map((s) => s.trim()).filter((s) => s && s !== form.image.trim()))];
  return {
    data: {
      name, slug, category: form.category, description: form.description.trim(), careInstructions: form.careInstructions.trim(),
      price, originalPrice, stock, lowStockAt, inStock: !!form.inStock,
      hasVariants: variants !== null, variants, image: form.image.trim(), images: extra.length ? [form.image.trim(), ...extra] : null,
      order, status: form.status,
    },
  };
}

export function stockLabel(p) {
  if (typeof p.stock !== "number") return { id: "untracked", text: "Stock not tracked", tone: "lavender" };
  if (p.stock <= 0) return { id: "out", text: "Out of stock", tone: "danger" };
  if (p.stock <= (typeof p.lowStockAt === "number" ? p.lowStockAt : DEFAULT_LOW_STOCK)) return { id: "low", text: `Low stock: ${p.stock}`, tone: "warning" };
  return { id: "ok", text: "In stock", tone: "success" };
}

export function duplicateSlug(slug, taken) {
  let n = 1;
  let candidate = `${slug}-copy`.slice(0, 60);
  while (taken.includes(candidate)) candidate = `${slug}-copy-${++n}`.slice(0, 60);
  return candidate;
}
