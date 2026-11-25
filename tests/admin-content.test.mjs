import assert from "node:assert/strict";
import { mergeCategories, isLive } from "../src/shop/categoryLogic.js";
import { duplicateSlug, emptyProduct, productToForm, slugify, stockLabel, validateProduct } from "../src/admin/productForm.js";
import { settingsToForm, validateSettings } from "../src/admin/settingsForm.js";
import { parsePageText, validatePage } from "../src/admin/pageText.js";
import { activeSalePercent } from "../src/site/saleLogic.js";
import { DEFAULT_SETTINGS } from "../src/site/siteDefaults.js";

// categories
const meta = [{ id: "stickers", label: "Stickers", icon: "sticker" }, { id: "washi", label: "Washi Tapes", icon: "tape" }];
let c = mergeCategories(meta, []);
assert.deepEqual(c.map((x) => x.id), ["stickers", "washi"]); assert.ok(c.every((x) => x.active && x.showOnHome && x.builtIn));
c = mergeCategories(meta, [{ id: "washi", label: "Washi", order: 5, active: false }, { id: "new-one", label: "Lanyards", order: 15 }, { nope: 1 }, null]);
assert.deepEqual(c.map((x) => x.id), ["washi", "stickers", "new-one"]); assert.equal(c[0].active, false); assert.equal(c[0].label, "Washi"); assert.equal(c[2].builtIn, false);
assert.equal(c[2].icon, "sticker", "new categories get a default icon");
assert.equal(isLive({}), true); assert.equal(isLive({ status: "published" }), true); assert.equal(isLive({ status: "draft" }), false); assert.equal(isLive({ status: "archived" }), false);

// products
assert.equal(slugify("  Cute Cat – Sticker!! "), "cute-cat-sticker");
const ctx = { isNew: true, takenSlugs: ["taken"], categoryIds: ["stickers"] };
const good = { ...emptyProduct("stickers"), name: "Panda", slug: "panda", price: "70", image: "/products/p.jpg", status: "published" };
let r = validateProduct(good, ctx); assert.equal(r.errors, undefined); assert.equal(r.data.price, 70); assert.equal(r.data.stock, null); assert.equal(r.data.variants, null); assert.equal(r.data.images, null);
assert.ok(validateProduct({ ...good, name: "" }, ctx).errors.name);
assert.ok(validateProduct({ ...good, slug: "Bad Slug" }, ctx).errors.slug);
assert.ok(validateProduct({ ...good, slug: "taken" }, ctx).errors.slug); assert.equal(validateProduct({ ...good, slug: "taken" }, { ...ctx, isNew: false }).errors, undefined);
assert.ok(validateProduct({ ...good, category: "zzz" }, ctx).errors.category);
assert.ok(validateProduct({ ...good, price: "7.5" }, ctx).errors.price); assert.ok(validateProduct({ ...good, price: "-3" }, ctx).errors.price);
assert.ok(validateProduct({ ...good, originalPrice: "60" }, ctx).errors.originalPrice); assert.equal(validateProduct({ ...good, originalPrice: "90" }, ctx).data.originalPrice, 90);
assert.ok(validateProduct({ ...good, stock: "abc" }, ctx).errors.stock); assert.equal(validateProduct({ ...good, stock: "12" }, ctx).data.stock, 12); assert.equal(validateProduct({ ...good, stock: "0" }, ctx).data.stock, 0);
assert.ok(validateProduct({ ...good, image: "" }, ctx).errors.image);
r = validateProduct({ ...good, hasVariants: true, price: "", variants: [{ label: "Small", price: "50" }, { label: "Large", price: "90" }, { label: "", price: "" }] }, ctx);
assert.deepEqual(r.data.variants, [{ label: "Small", price: 50 }, { label: "Large", price: 90 }]); assert.equal(r.data.price, 50, "price follows the cheapest option");
assert.ok(validateProduct({ ...good, hasVariants: true, variants: [{ label: "A", price: "5" }, { label: "a", price: "6" }] }, ctx).errors.variants, "duplicate option names");
assert.ok(validateProduct({ ...good, hasVariants: true, variants: [{ label: "A", price: "" }] }, ctx).errors.variants);
r = validateProduct({ ...good, extraImages: ["/products/a.jpg", "/products/p.jpg", "", "/products/a.jpg"] }, ctx); assert.deepEqual(r.data.images, ["/products/p.jpg", "/products/a.jpg"]);
// round trip
const saved = { ...r.data, stock: 4, variants: null };
const back = validateProduct(productToForm(saved), { ...ctx, isNew: false }).data;
assert.deepEqual(back, { ...saved, hasVariants: false }, "form round trip keeps the product the same");
assert.equal(productToForm({ name: "Old", slug: "old", category: "stickers", price: 10, image: "/a.jpg", images: ["/a.jpg", "/b.jpg"] }).extraImages.length, 1, "old products load");
assert.equal(productToForm({ slug: "x", price: 1 }).status, "published", "products with no status count as published");
assert.equal(stockLabel({}).id, "untracked"); assert.equal(stockLabel({ stock: 0 }).id, "out"); assert.equal(stockLabel({ stock: 3 }).id, "low"); assert.equal(stockLabel({ stock: 3, lowStockAt: 2 }).id, "ok"); assert.equal(stockLabel({ stock: 50 }).id, "ok");
assert.equal(duplicateSlug("panda", ["panda"]), "panda-copy"); assert.equal(duplicateSlug("panda", ["panda-copy", "panda-copy-2"]), "panda-copy-3");

// settings
const form = settingsToForm(DEFAULT_SETTINGS);
let s = validateSettings(form); assert.equal(s.errors, undefined); assert.equal(s.data.sale.active, false);
assert.ok(validateSettings({ ...form, heroTitle: "" }).errors.heroTitle);
assert.ok(validateSettings({ ...form, contactEmail: "nope" }).errors.contactEmail);
assert.ok(validateSettings({ ...form, phone: "123" }).errors.phone); assert.equal(validateSettings({ ...form, phone: "+91 98765 43210" }).data.phone, "9876543210");
assert.ok(validateSettings({ ...form, instagramHandle: "bad name" }).errors.instagramHandle); assert.equal(validateSettings({ ...form, instagramHandle: "@stickbe.co" }).data.instagramUrl, "https://instagram.com/stickbe.co");
assert.ok(validateSettings({ ...form, announcementOn: true, announcement: "" }).errors.announcement);
assert.ok(validateSettings({ ...form, trustItems: [{ title: "", text: "x" }] }).errors.trustItems);
assert.ok(validateSettings({ ...form, saleOn: true, salePercent: "" }).errors.salePercent); assert.ok(validateSettings({ ...form, saleOn: true, salePercent: "95" }).errors.salePercent);
assert.ok(validateSettings({ ...form, saleOn: true, salePercent: "10", saleFrom: "2026-11-10", saleTo: "2026-11-05" }).errors.saleTo);
s = validateSettings({ ...form, saleOn: true, salePercent: "15", saleLabel: "Diwali sale", saleFrom: "2026-11-10", saleTo: "2026-11-12" });
assert.deepEqual(s.data.sale, { active: true, percent: 15, label: "Diwali sale", startsAt: "2026-11-10T00:00:00+05:30", endsAt: "2026-11-13T00:00:00+05:30" });
const ist = (d, t) => Date.parse(`${d}T${t}+05:30`);
assert.equal(activeSalePercent(s.data.sale, ist("2026-11-12", "23:59:00")), 15, "the last day is included, through midnight India time");
assert.equal(activeSalePercent(s.data.sale, ist("2026-11-13", "00:00:01")), 0); assert.equal(activeSalePercent(s.data.sale, ist("2026-11-09", "23:00:00")), 0);
const again = settingsToForm({ ...DEFAULT_SETTINGS, sale: s.data.sale }); assert.equal(again.saleFrom, "2026-11-10"); assert.equal(again.saleTo, "2026-11-12"); assert.equal(again.salePercent, "15");

// pages
assert.deepEqual(parsePageText("## Hello\n\nSome text\nmore\n\n- a\n- b\n\n## Head\nBody under head"),
  [{ type: "heading", text: "Hello" }, { type: "para", text: "Some text\nmore" }, { type: "list", items: ["a", "b"] }, { type: "heading", text: "Head" }, { type: "para", text: "Body under head" }]);
assert.deepEqual(parsePageText("<script>alert(1)</script>"), [{ type: "para", text: "<script>alert(1)</script>" }], "html stays plain text");
assert.deepEqual(parsePageText(""), []);
assert.ok(validatePage({ title: "", body: "x", published: false }).errors.title); assert.ok(validatePage({ title: "T", body: " ", published: true }).errors.body);
assert.equal(validatePage({ title: "T", body: "", published: false }).errors, undefined);
console.log("ok: products, categories, settings and pages logic");
