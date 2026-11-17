const DAY_MS = 24 * 60 * 60 * 1000;

const HERO_CATEGORY_IDS = ["stickers", "frame", "bookmarks", "bigposters", "notebook"];
const HERO_CATEGORY_LABELS = [
  "stickers",
  "wall frames",
  "bookmarks",
  "big wall posters",
  "journals & notepads",
  "colouring books",
  "coloring books",
];

function isHeroCategory(cat) {
  return HERO_CATEGORY_IDS.includes(cat.id) || HERO_CATEGORY_LABELS.includes((cat.label || "").trim().toLowerCase());
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rand) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function itemImage(item) {
  if (item.image) return item.image;
  if (Array.isArray(item.images) && item.images.length > 0) return item.images[0];
  return null;
}

export function isAvailable(item) {
  return item.inStock !== false && (typeof item.stock !== "number" || item.stock > 0);
}

export function pickHeroProducts(categories, { count = 4, windowDays = 2, now = Date.now() } = {}) {
  const pools = categories
    .filter(isHeroCategory)
    .map((cat) => ({
      id: cat.id,
      items: cat.items
        .filter((item) => !item.isCustom && item.slug && itemImage(item) && isAvailable(item))
        .sort((a, b) => a.slug.localeCompare(b.slug))
        .map((item) => ({ ...item, categoryLabel: cat.label, categoryId: cat.id })),
    }))
    .filter((pool) => pool.items.length > 0);

  if (pools.length === 0) return [];

  const seed = Math.floor(now / (windowDays * DAY_MS));
  const rand = mulberry32(seed);
  const orderedPools = shuffle(pools, rand).map((pool) => ({ ...pool, items: shuffle(pool.items, rand) }));

  const picked = [];
  let round = 0;
  while (picked.length < count && orderedPools.some((p) => p.items.length > round)) {
    for (const pool of orderedPools) {
      if (picked.length >= count) break;
      if (pool.items[round]) picked.push(pool.items[round]);
    }
    round += 1;
  }
  return picked;
}

export function categoryCover(category) {
  const item = category.items.find((i) => !i.isCustom && itemImage(i) && isAvailable(i)) || category.items.find((i) => itemImage(i));
  return item ? itemImage(item) : null;
}
