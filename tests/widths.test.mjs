import { chromium } from "playwright-core";
import assert from "node:assert/strict";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const pages = [["harness.html", "home pieces"], ["shop.html", "shop"], ["cart.html", "cart"], ["acc.html", "account"], ["pages.html", "pages"], ["admin.html#/admin/products", "admin products"], ["admin.html#/admin/settings", "admin settings"]];
const sizes = [[360, 740], [768, 1024], [1024, 768], [1440, 900], [1920, 1080], [2560, 1300]];
let bad = 0;
for (const [url, name] of pages) for (const [w, h] of sizes) {
  const pg = await b.newPage({ viewport: { width: w, height: h } });
  await pg.goto(`http://localhost:5199/${url}`); if (url.includes("#")) await pg.reload(); await pg.waitForTimeout(700);
  const r = await pg.evaluate(() => {
    const el = document.querySelector(".sb-hero__inner, .sb-shop, .sb-page, .sb-cart, main") || document.body;
    const rect = el.getBoundingClientRect();
    return { over: document.documentElement.scrollWidth - innerWidth, contentW: Math.round(rect.width), left: Math.round(rect.left) };
  });
  const ok = r.over <= 1;
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "BAD"} ${name} @${w}: content ${r.contentW}px, left gap ${r.left}px, overflow ${r.over}`);
  if (w === 1440 && name === "home pieces") await pg.screenshot({ path: "/tmp/w1440.png" });
  if (w === 1920 && name === "shop") await pg.screenshot({ path: "/tmp/w1920-shop.png" });
  await pg.close();
}
await b.close(); assert.equal(bad, 0, "some pages overflow");
console.log("ok: no horizontal overflow at any size");
