import { useId } from "react";

function Field({ label, hint, error, id, children }) {
  const autoId = useId();
  const fieldId = id || autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="sb-field">
      {label && (
        <label className="sb-field__label" htmlFor={fieldId}>
          {label}
        </label>
      )}
      {children({ id: fieldId, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && !error && (
        <span className="sb-field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="sb-field__error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function Input({ label, hint, error, id, className = "", ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      {(aria) => <input className={`sb-input ${className}`.trim()} {...aria} {...rest} />}
    </Field>
  );
}

export function Textarea({ label, hint, error, id, className = "", ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      {(aria) => <textarea className={`sb-input ${className}`.trim()} {...aria} {...rest} />}
    </Field>
  );
}

export function Select({ label, hint, error, id, className = "", children, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      {(aria) => (
        <select className={`sb-input ${className}`.trim()} {...aria} {...rest}>
          {children}
        </select>
      )}
    </Field>
  );
}
