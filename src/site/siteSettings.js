import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_SALE, activeSalePercent, cleanSale } from "./saleLogic.js";

export const DEFAULT_SETTINGS = {
  announcement: "No COD available — prepayment required for all orders",
  heroEyebrow: "Handmade with love",
  heroTitle: "Bringing little joys to your everyday.",
  heroSubtitle:
    "Cute homegrown stickers, washi tapes, memo pads, bookmarks and stationery — made with love, just for you.",
  trustItems: [
    { title: "Handmade with love", text: "Every piece is made by hand." },
    { title: "Packed by hand", text: "Every order is packed with care, big or small." },
    { title: "Bulk orders welcome", text: "Need a larger quantity? We ship bulk orders too." },
    { title: "Prepaid orders", text: "No COD. Prepayment is required on all orders." },
    { title: "Simple delivery", text: "Flat ₹40 delivery, ₹20 within Agra. Minimum order ₹99." },
  ],
  storyEyebrow: "Our story",
  storyTitle: "A little about us",
  storyText:
    "StickBe started as a small passion project — handmade stickers, washi tapes, and stationery made with a lot of love and zero shortcuts. Every order is packed by hand, big or small. Thank you for supporting something small and homegrown.",
  instagramHandle: "stickbe.co",
  instagramUrl: "https://instagram.com/stickbe.co",
  contactEmail: "stickbe.co@gmail.com",
  footerTagline: "Good things take time.",
  sale: DEFAULT_SALE,
};

function mergeSettings(remote) {
  const merged = { ...DEFAULT_SETTINGS };
  if (!remote || typeof remote !== "object") return merged;
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const value = remote[key];
    if (typeof DEFAULT_SETTINGS[key] === "string" && typeof value === "string" && value.trim() !== "") {
      merged[key] = value;
    } else if (Array.isArray(DEFAULT_SETTINGS[key]) && Array.isArray(value) && value.length > 0) {
      merged[key] = value.filter((v) => v && typeof v.title === "string" && v.title.trim() !== "");
    }
  }
  merged.sale = cleanSale(remote.sale);
  if (merged.trustItems.length === 0) merged.trustItems = DEFAULT_SETTINGS.trustItems;
  return merged;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getDoc(doc(db, "settings", "site"))
        .then((snap) => {
          if (!cancelled && snap.exists()) setSettings(mergeSettings(snap.data()));
        })
        .catch(() => {});
    load();
    // Checkout fires this when the server says prices changed (for example a sale just ended).
    window.addEventListener(SETTINGS_STALE_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(SETTINGS_STALE_EVENT, load);
    };
  }, []);

  return settings;
}

export const SETTINGS_STALE_EVENT = "stickbe:settings-stale";

/** The sale percent right now. Re-checks every minute so a sale starts and ends on time. */
export function useSalePercent(settings) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  return activeSalePercent(settings.sale, now);
}
