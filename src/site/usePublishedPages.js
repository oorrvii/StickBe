import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { PAGE_SLOTS } from "../admin/pageText.js";

const ORDER = PAGE_SLOTS.map((p) => p.slug);

/** Footer links: only pages that have been published. Quietly empty if loading fails. */
export function usePublishedPages() {
  const [pages, setPages] = useState([]);
  useEffect(() => {
    let cancelled = false;
    getDocs(query(collection(db, "pages"), where("published", "==", true)))
      .then((snap) => {
        if (cancelled) return;
        const list = snap.docs.map((d) => ({ slug: d.id, title: d.data().title || d.id }));
        setPages(list.filter((p) => ORDER.includes(p.slug)).sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return pages;
}
