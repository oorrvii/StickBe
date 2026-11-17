import { pageWindow } from "./shopLogic.js";

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = pageWindow(page, totalPages);
  return (
    <nav className="sb-pager" aria-label="Pagination">
      <button type="button" className="sb-pager__btn" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous page">
        ‹
      </button>
      {pages.map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="sb-pager__gap" aria-hidden="true">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className={`sb-pager__btn${p === page ? " sb-pager__btn--active" : ""}`}
            onClick={() => onChange(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}
      <button type="button" className="sb-pager__btn" onClick={() => onChange(page + 1)} disabled={page === totalPages} aria-label="Next page">
        ›
      </button>
    </nav>
  );
}
