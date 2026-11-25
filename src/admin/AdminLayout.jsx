import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Alert, Spinner } from "../ui/index.js";
import { useAccount } from "../app/AccountContext.jsx";
import { isAdminUser } from "./adminConfig.js";
import "./admin.css";

const NAV = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/classic", label: "Products" },
];

export default function AdminLayout() {
  const { user, authChecked } = useAccount();
  const location = useLocation();

  if (!authChecked) return <div className="sb-page"><Spinner label="Checking your login" /></div>;
  if (!user) {
    return (
      <div className="sb-page">
        <h1>Admin</h1>
        <Alert tone="info">Please <Link className="sb-linkbtn sb-linkbtn--strong" to={`/sign-in?next=${encodeURIComponent(location.pathname)}`}>log in</Link> with the shop owner account.</Alert>
      </div>
    );
  }
  if (!isAdminUser(user)) {
    return (
      <div className="sb-page">
        <h1>Admin</h1>
        <Alert tone="error">This area is only for the shop owner. You are signed in as {user.email}.</Alert>
      </div>
    );
  }

  return (
    <div className="sb-page sb-account">
      <aside className="sb-account__side">
        <p className="sb-eyebrow">Admin</p>
        <nav aria-label="Admin">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `sb-sidelink${isActive ? " is-active" : ""}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="sb-account__main">
        <Outlet />
      </section>
    </div>
  );
}
