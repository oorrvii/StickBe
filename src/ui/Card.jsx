export default function Card({ padded = false, onClick, className = "", children, ...rest }) {
  const interactive = typeof onClick === "function";
  const classes = [
    "sb-card",
    padded ? "sb-card--pad" : "",
    interactive ? "sb-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleKeyDown = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <div
      className={classes}
      onClick={onClick}
      onKeyDown={interactive ? handleKeyDown : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
