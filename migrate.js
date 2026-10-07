// migrate.js
// One-time script: uploads all products from CATEGORIES into a Firestore
// "products" collection, flattened (each item becomes its own document,
// tagged with a "category" field).
//
// Run with:  node migrate.js
// (run this from inside your stickbe folder, on the feature/firebase-backend branch)

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { CATEGORIES } from "./src/categoriesData.js";

// ---- 1. connect using the admin key (never gets committed to git) ----
const serviceAccount = JSON.parse(
  readFileSync(new URL("./serviceAccountKey.json", import.meta.url))
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// ---- 2. flatten CATEGORIES into one list of products ----
function flattenProducts() {
  const products = [];
  for (const cat of CATEGORIES) {
    cat.items.forEach((item, index) => {
      products.push({
        ...item,
        category: cat.id,          // e.g. "stickers"
        categoryLabel: cat.label,  // e.g. "Stickers"
        aspectRatio: cat.aspectRatio || null,
        fit: cat.fit || null,
        order: index,              // preserves original position within its category
      });
    });
  }
  return products;
}

// ---- 3. upload in batches (Firestore allows max 500 writes per batch) ----
async function migrate() {
  const products = flattenProducts();
  console.log(`Found ${products.length} products to upload...`);

  const BATCH_SIZE = 450;
  let uploaded = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const chunk = products.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const product of chunk) {
      // use the slug as the document ID so it's human-readable
      // and so re-running this script safely overwrites instead of duplicating
      const docId = product.slug;
      if (!docId) {
        console.warn(`Skipping a product with no slug:`, product.name);
        continue;
      }
      const ref = db.collection("products").doc(docId);
      batch.set(ref, product);
    }

    await batch.commit();
    uploaded += chunk.length;
    console.log(`Uploaded ${uploaded}/${products.length}...`);
  }

  console.log("Done! All products are now in Firestore.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});