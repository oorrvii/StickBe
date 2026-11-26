import assert from "node:assert/strict";
import { splitAccent, plainHeadline } from "../src/site/accentText.js";
import { mosaicSpans } from "../src/site/categoryLayout.js";

assert.deepEqual(splitAccent("Bringing little *joys* to your everyday."), [
  { text: "Bringing little ", accent: false }, { text: "joys", accent: true }, { text: " to your everyday.", accent: false }]);
assert.deepEqual(splitAccent("No marks"), [{ text: "No marks", accent: false }]);
assert.deepEqual(splitAccent("Odd *star"), [{ text: "Odd *star", accent: false }]);
assert.equal(plainHeadline("A *b* c"), "A b c");
assert.equal(plainHeadline(""), "");

// Every row of the mosaic must add up to 12, for any number of categories.
for (let n = 1; n <= 30; n += 1) {
  const spans = mosaicSpans(n);
  assert.equal(spans.length, n, `count ${n}`);
  let sum = 0; let rows = 0;
  for (const s of spans) { sum += s; if (sum === 12) { sum = 0; rows += 1; } else assert.ok(sum < 12, `row overflow at ${n}`); }
  assert.equal(sum, 0, `last row incomplete at ${n}: ${spans}`);
}
console.log("ok: headline accent and category mosaic");

import { emptyProduct, validateProduct } from "../src/admin/productForm.js";
const base = { ...emptyProduct("stickers"), name: "A", slug: "a", price: "10", image: "/products/a.jpg", description: "d" };
let r = validateProduct({ ...base, featured: true }, { isNew: true, takenSlugs: [], categoryIds: ["stickers"] });
assert.equal(r.data.featured, true);
r = validateProduct({ ...base }, { isNew: true, takenSlugs: [], categoryIds: ["stickers"] });
assert.equal(r.data.featured, false);
console.log("ok: featured flag on products");
