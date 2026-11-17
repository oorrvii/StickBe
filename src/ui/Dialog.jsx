import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Dialog({ open, onClose, title, ariaLabel, size = "md", zIndex, closeOnOverlay = true, children, actions }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const node = dialogRef.current;
    const first = node && node.querySelector(FOCUSABLE);
    (first || node)?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      if (previouslyFocused.current && typeof previouslyFocused.current.focus === "function") {
        previouslyFocused.current.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;

    const focusables = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE));
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const firstEl = focusables[0];
    const lastEl = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  };

  return createPortal(
    <div
      className="sb-overlay sb2"
      style={zIndex ? { zIndex } : undefined}
      onMouseDown={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`sb-dialog${size === "lg" ? " sb-dialog--lg" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={!ariaLabel && title ? titleId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <button type="button" className="sb-dialog__close" onClick={onClose} aria-label="Close dialog">
          ×
        </button>
        {title && (
          <h2 className="sb-dialog__title" id={titleId}>
            {title}
          </h2>
        )}
        {children}
        {actions && <div className="sb-dialog__actions">{actions}</div>}
      </div>
    </div>,
    document.body
  );
}
