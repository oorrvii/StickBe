import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Skeleton } from "../ui/index.js";
import { parsePageText } from "../admin/pageText.js";

/** A page written in Admin > Pages. Shown only when published. Text is rendered as plain text, never HTML. */
export default function ContentPage({ slug }) {
  const [state, setState] = useState({ slug: "", page: null, failed: false });

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, "pages", slug))
      .then((snap) => {
        const d = snap.exists() ? snap.data() : null;
        if (!cancelled) setState({ slug, page: d && d.published === true ? d : null, failed: false });
      })
      .catch(() => { if (!cancelled) setState({ slug, page: null, failed: true }); });
    return () => { cancelled = true; };
  }, [slug]);

  if (state.slug !== slug) return <div className="sb-contentpage" aria-busy="true"><Skeleton height={40} style={{ display: "block", marginBottom: 16 }} /><Skeleton height={200} style={{ display: "block" }} /></div>;
  if (!state.page) {
    return (
      <div className="sb-contentpage">
        <h1>{state.failed ? "We couldn't load this page" : "This page isn't available"}</h1>
        <p>{state.failed ? "Please check your connection and try again." : "It may not be published yet."}</p>
        <Link className="sb-btn sb-btn--secondary" to="/">Back to the shop</Link>
      </div>
    );
  }
  return (
    <article className="sb-contentpage">
      <h1>{state.page.title}</h1>
      {parsePageText(state.page.body).map((b, i) =>
        b.type === "heading" ? <h2 key={i}>{b.text}</h2>
          : b.type === "list" ? <ul key={i}>{b.items.map((t, n) => <li key={n}>{t}</li>)}</ul>
          : <p key={i}>{b.text}</p>)}
    </article>
  );
}
