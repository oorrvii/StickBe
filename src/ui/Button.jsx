export default function Button({
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  children,
  ...rest
}) {
  const classes = [
    "sb-btn",
    `sb-btn--${variant}`,
    size !== "md" ? `sb-btn--${size}` : "",
    block ? "sb-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="sb-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
