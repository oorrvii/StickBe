import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { CATEGORY_META } from "../categoryMeta.js";

const CatalogContext = createContext(null);

const EMPTY = CATEGORY_META.map((cat) => ({ ...cat, items: [] }));

function fetchCategories() {
  return getDocs(collection(db, "products")).then((snapshot) => {
    const all = snapshot.docs.map((d) => d.data());
    return CATEGORY_META.map((meta) => ({
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
