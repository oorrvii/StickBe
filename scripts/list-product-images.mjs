// Writes src/admin/productImages.json: every image in public/products.
// The admin uses it for the photo dropdown. It runs before `npm run dev` and `npm run build`.
import { mkdirSync, readdirSync, writeFileSync, existsSync } from "node:fs";

const dir = "public/products";
const files = existsSync(dir)
  ? readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && /\.(jpe?g|png|webp|avif|gif)$/i.test(e.name))
      .map((e) => `/products/${e.name}`)
      .sort((a, b) => a.localeCompare(b))
  : [];
mkdirSync("src/admin", { recursive: true });
writeFileSync("src/admin/productImages.json", JSON.stringify(files, null, 2) + "\n");
console.log(`Found ${files.length} product photos.`);
