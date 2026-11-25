import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { activeSalePercent, cleanSale } from "./saleLogic.js";
import { DEFAULT_SETTINGS } from "./siteDefaults.js";

export { DEFAULT_SETTINGS };

export function mergeSettings(remote) {
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
  // Strings here may be cleared on purpose, so blank is a real value.
  for (const key of ["phone", "whatsapp", "shippingNote"]) {
    if (typeof remote[key] === "string") merged[key] = remote[key].trim();
  }
  merged.announcementOn = remote.announcementOn !== false;
  if (!merged.announcementOn) merged.announcement = "";
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
