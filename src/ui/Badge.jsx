export default function Badge({ tone = "violet", className = "", children, ...rest }) {
  return (
    <span className={`sb-badge sb-badge--${tone} ${className}`.trim()} {...rest}>
      {children}
    </span>
  );
}
