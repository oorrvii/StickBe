import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { CATEGORY_META } from "../categoryMeta.js";
import { isLive, mergeCategories } from "./categoryLogic.js";

const CatalogContext = createContext(null);

const EMPTY = CATEGORY_META.map((cat) => ({ ...cat, items: [] }));

function fetchCategories() {
  const remote = getDocs(collection(db, "categories"))
    .then((snap) => snap.docs.map((d) => ({ ...d.data(), id: d.id })))
    .catch(() => []); // categories are optional; the built-in list is the fallback
  return Promise.all([getDocs(collection(db, "products")), remote]).then(([snapshot, remoteCats]) => {
    const all = snapshot.docs.map((d) => d.data()).filter(isLive);
    return mergeCategories(CATEGORY_META, remoteCats)
      .filter((c) => c.active !== false)
      .map((meta) => ({
        ...meta,
        items: all
          .filter((p) => p.category === meta.id)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.slug || "").localeCompare(b.slug || "")),
      }));
  });
}

export function CatalogProvider({ children }) {
  const [categories, setCategories] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((next) => {
        if (!cancelled) setCategories(next);
      })
      .catch((err) => {
        console.error("Failed to load products from Firestore:", err);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(() => {
    setError(false);
    setLoading(true);
    return fetchCategories()
      .then(setCategories)
      .catch((err) => {
        console.error("Failed to load products from Firestore:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  return <CatalogContext.Provider value={{ categories, loading, error, reload }}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  return useContext(CatalogContext);
}
