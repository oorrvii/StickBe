export function Spinner({ label = "Loading" }) {
  return (
    <span role="status" style={{ display: "inline-flex", alignItems: "center" }}>
      <span className="sb-spinner" aria-hidden="true" />
      <span className="sb-visually-hidden">{label}</span>
    </span>
  );
}

export function Alert({ tone = "info", children, ...rest }) {
  const role = tone === "error" || tone === "warning" ? "alert" : "status";
  return (
    <div className={`sb-alert sb-alert--${tone}`} role={role} {...rest}>
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="sb-empty">
      <p className="sb-empty__title">{title}</p>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ width = "100%", height = 16, style, ...rest }) {
  return <span className="sb-skeleton" aria-hidden="true" style={{ width, height, ...style }} {...rest} />;
}
