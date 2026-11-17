import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db } from "../firebase";
import { Alert, Badge, Button, Card, EmptyState, Input, Select, Skeleton, Spinner } from "../ui/index.js";
import { useAccount } from "../app/AccountContext.jsx";
import { useSiteSettings } from "../site/index.js";
import FitImage from "../site/FitImage.jsx";
import { useCatalog } from "../shop/CatalogContext.jsx";
import { itemImage } from "../shop/shopLogic.js";
import { INDIAN_STATES, formatAddress, newAddressId, normalizePhone } from "../app/addressUtils.js";
import { formatOrderDate, orderNumber, statusOf, ORDER_STATUS } from "../app/orderUtils.js";

const NAV = [
  { to: "/account", label: "Overview", end: true },
  { to: "/account/orders", label: "My orders" },
  { to: "/account/addresses", label: "Addresses" },
  { to: "/account/profile", label: "Profile" },
  { to: "/account/help", label: "Help and contact" },
];

function PageHead({ eyebrow, title, lead, action }) {
  return (
    <header className="sb-account__head">
      <div>
        <p className="sb-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {lead && <p className="sb-account__lead">{lead}</p>}
      </div>
      {action}
    </header>
  );
}

export function AccountLayout() {
  const { user, authChecked } = useAccount();
  const location = useLocation();

  if (!authChecked) return <div className="sb-page"><Spinner label="Loading your account" /></div>;
  if (!user) return <Navigate to={`/sign-in?next=${encodeURIComponent(location.pathname)}`} replace />;

  return (
    <div className="sb-page sb-account">
      <aside className="sb-account__side">
        <p className="sb-eyebrow">Your account</p>
        <nav aria-label="Account">
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

function useMyOrders(uid) {
  const [state, setState] = useState({ orders: [], loading: true, error: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getDocs(query(collection(db, "orders"), where("userId", "==", uid)))
      .then((snap) => {
        const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        if (!cancelled) setState({ orders, loading: false, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ orders: [], loading: false, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  const retry = () => {
    setState((s) => ({ ...s, loading: true, error: false }));
    setAttempt((n) => n + 1);
  };
  return { ...state, retry };
}

function OrderRow({ order }) {
  const status = statusOf(order);
  const items = order.items || [];
  return (
    <Link className="sb-order" to={`/account/orders/${order.id}`}>
      <div className="sb-order__top">
        <div>
          <p className="sb-order__num">{order.orderNumber || orderNumber(order)}</p>
          <p className="sb-order__date">{order.createdAt ? formatOrderDate(order.createdAt) : ""}</p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <div className="sb-order__bottom">
        <p className="sb-order__items">
          {items.slice(0, 2).map((i) => i.name).join(", ")}
          {items.length > 2 ? ` and ${items.length - 2} more` : ""}
        </p>
        <strong>₹{order.total}</strong>
      </div>
    </Link>
  );
}

function OrdersSkeleton() {
  return (
    <div className="sb-orders" aria-busy="true">
      {[0, 1].map((i) => <Skeleton key={i} height={96} style={{ display: "block" }} />)}
    </div>
  );
}

export function AccountOrders() {
  const { user } = useAccount();
  const { orders, loading, error, retry } = useMyOrders(user.uid);
  const [filter, setFilter] = useState("all");
  const shown = useMemo(() => orders.filter((o) => filter === "all" || (o.status || "new") === filter), [orders, filter]);

  return (
    <>
      <PageHead eyebrow="My orders" title="Your orders" />
      <div className="sb-orders__filter">
        <Select label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All orders</option>
          {Object.entries(ORDER_STATUS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
        </Select>
      </div>
      {error ? (
        <Alert tone="error">We couldn't load your orders. <Button size="sm" variant="secondary" onClick={retry}>Try again</Button></Alert>
      ) : loading ? (
        <OrdersSkeleton />
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState title={orders.length ? "No orders with that status" : "No orders yet"} action={<Link className="sb-btn sb-btn--secondary sb-btn--sm" to="/#shop">Browse the shop</Link>}>
            {orders.length ? "Try another filter." : "Order requests you send will show up here."}
          </EmptyState>
        </Card>
      ) : (
        <div className="sb-orders">{shown.map((o) => <OrderRow key={o.id} order={o} />)}</div>
      )}
    </>
  );
}

export function AccountOverview() {
  const { user, displayName, cart, logOut } = useAccount();
  const navigate = useNavigate();
  const { orders, loading, error } = useMyOrders(user.uid);
  const first = (displayName || user.email.split("@")[0]).split(" ")[0];
  const cartCount = cart.reduce((n, i) => n + i.qty, 0);
  const recent = orders.slice(0, 2);

  return (
    <>
      <PageHead eyebrow="Overview" title={`Hi, ${first}.`} lead={`Signed in as ${user.email}.`} />
      <div className="sb-account__cards">
        <Card padded>
          <h3>Recent orders</h3>
          {error ? (
            <p>We couldn't load your orders right now.</p>
          ) : loading ? (
            <Skeleton height={48} style={{ display: "block" }} />
          ) : recent.length === 0 ? (
            <>
              <p>You have no orders yet. Order requests you send will show up here.</p>
              <Link className="sb-btn sb-btn--primary sb-btn--sm" to="/#shop">Browse the shop</Link>
            </>
          ) : (
            <>
              <ul className="sb-account__recent">
                {recent.map((o) => (
                  <li key={o.id}><Link to={`/account/orders/${o.id}`}>{o.orderNumber || orderNumber(o)}</Link><Badge tone={statusOf(o).tone}>{statusOf(o).label}</Badge></li>
                ))}
              </ul>
              <Link className="sb-linkbtn sb-linkbtn--strong" to="/account/orders">See all orders</Link>
            </>
          )}
        </Card>
        <Card padded>
          <h3>Quick links</h3>
          <ul className="sb-account__links">
            <li><Link to={cartCount ? "/cart" : "/#shop"}>{cartCount ? `Your cart (${cartCount})` : "Your cart"}</Link></li>
            <li><Link to="/wishlist">Your wishlist</Link></li>
            <li><Link to="/account/addresses">Saved addresses</Link></li>
            <li><Link to="/account/help">Help and contact</Link></li>
          </ul>
        </Card>
      </div>
      <div className="sb-account__signout">
        <Button variant="secondary" onClick={async () => { await logOut(); navigate("/"); }}>Log out</Button>
      </div>
    </>
  );
}

const EMPTY_FORM = { fullName: "", phone: "", line1: "", line2: "", landmark: "", city: "", state: "", pincode: "", isDefault: false };

function AddressForm({ initial, first, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial, isDefault: first ? true : !!initial?.isDefault });
  const [errors, setErrors] = useState({});

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
    error: errors[key],
  });

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Enter the receiver's name";
    if (normalizePhone(form.phone).length !== 10) next.phone = "Enter a 10-digit mobile number";
    if (!form.line1.trim()) next.line1 = "Enter the house or flat number and street";
    if (!form.city.trim()) next.city = "Enter your city or town";
    if (!form.state) next.state = "Choose a state";
    if (!/^\d{6}$/.test(form.pincode.trim())) next.pincode = "Enter a 6-digit PIN code";
    setErrors(next);
    if (Object.keys(next).length) return;
    onSave({
      ...form,
      id: initial?.id || newAddressId(),
      fullName: form.fullName.trim(),
      phone: normalizePhone(form.phone),
      line1: form.line1.trim(),
      line2: form.line2.trim(),
      landmark: form.landmark.trim(),
      city: form.city.trim(),
      pincode: form.pincode.trim(),
      country: "India",
    });
  };

  return (
    <Card padded>
      <form className="sb-auth__form" onSubmit={submit}>
        <h2 className="sb-account__formtitle">{initial?.id ? "Edit address" : "New address"}</h2>
        <div className="sb-account__row">
          <Input label="Full name" autoComplete="name" {...field("fullName")} />
          <Input label="Mobile number" inputMode="numeric" autoComplete="tel" hint="10 digits, with or without +91" {...field("phone")} />
        </div>
        <Input label="Address line 1" autoComplete="address-line1" hint="House or flat number, building, street" {...field("line1")} />
        <Input label="Address line 2 (optional)" autoComplete="address-line2" {...field("line2")} />
        <div className="sb-account__row">
          <Input label="Landmark (optional)" {...field("landmark")} />
          <Input label="City or town" autoComplete="address-level2" {...field("city")} />
        </div>
        <div className="sb-account__row">
          <Select label="State" autoComplete="address-level1" {...field("state")}>
            <option value="">Choose a state</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="PIN code" inputMode="numeric" autoComplete="postal-code" {...field("pincode")} />
        </div>
        <Input label="Country" value="India" readOnly hint="We currently ship within India only." />
        <label className="sb-auth__show">
          <input type="checkbox" checked={form.isDefault} disabled={first} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
          Use as my default address
        </label>
        <div className="sb-account__actions">
          <Button type="submit">Save address</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

export function AccountAddresses() {
  const { addresses, saveAddresses } = useAccount();
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const save = (addr) => {
    const exists = addresses.some((a) => a.id === addr.id);
    let next = exists ? addresses.map((a) => (a.id === addr.id ? addr : a)) : [...addresses, addr];
    if (addr.isDefault) next = next.map((a) => ({ ...a, isDefault: a.id === addr.id }));
    saveAddresses(next);
    setEditing(null);
  };
  const remove = (id) => {
    saveAddresses(addresses.filter((a) => a.id !== id));
    setConfirmId(null);
  };

  if (editing) {
    return (
      <>
        <PageHead eyebrow="Addresses" title="Saved addresses" />
        <AddressForm initial={editing === "new" ? null : editing} first={addresses.length === 0 && editing === "new"} onSave={save} onCancel={() => setEditing(null)} />
      </>
    );
  }

  return (
    <>
      <PageHead
        eyebrow="Addresses"
        title="Saved addresses"
        lead="Your default address fills in at checkout."
        action={<Button onClick={() => setEditing("new")}>New address</Button>}
      />
      {addresses.length === 0 ? (
        <div className="sb-account__empty">
          <EmptyState title="No saved addresses">Save an address here to fill your details faster at checkout.</EmptyState>
        </div>
      ) : (
        <div className="sb-account__addrs">
          {addresses.map((a) => (
            <Card key={a.id} padded>
              <div className="sb-addr__top">
                <strong>{a.fullName}</strong>
                {a.isDefault && <Badge tone="violet">Default</Badge>}
              </div>
              <p className="sb-addr__text">{formatAddress(a)}</p>
              <p className="sb-addr__text">Mobile: {a.phone}</p>
              {confirmId === a.id ? (
                <div className="sb-account__actions" role="group" aria-label="Confirm delete">
                  <span>Delete this address?</span>
                  <Button size="sm" variant="danger" onClick={() => remove(a.id)}>Yes, delete</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>Keep it</Button>
                </div>
              ) : (
                <div className="sb-account__actions">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(a)}>Edit</Button>
                  {!a.isDefault && <Button size="sm" variant="ghost" onClick={() => saveAddresses(addresses.map((x) => ({ ...x, isDefault: x.id === a.id })))}>Make default</Button>}
                  <Button size="sm" variant="ghost" onClick={() => setConfirmId(a.id)}>Delete</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export function AccountProfile() {
  const { user, displayName, setDisplayName, profile, saveProfile } = useAccount();
  return (
    <>
      <PageHead eyebrow="Profile" title="Your profile" />
      <ProfileForm key={user.uid} user={user} displayName={displayName} setDisplayName={setDisplayName} profile={profile} saveProfile={saveProfile} />
    </>
  );
}


function ProfileForm({ user, displayName, setDisplayName, profile, saveProfile }) {
  const [name, setName] = useState(displayName || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [instagram, setInstagram] = useState(profile.instagram || "");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const isGoogle = user.providerData?.some((p) => p.providerId === "google.com");

  const save = async (e) => {
    e.preventDefault();
    const next = {};
    if (phone && normalizePhone(phone).length !== 10) next.phone = "Enter a 10-digit mobile number";
    if (!/^[A-Za-z0-9._]{1,40}$/.test(instagram.trim().replace(/^@/, ""))) next.instagram = "Enter your Instagram username";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setMsg(null);
    try {
      if (name.trim() !== (displayName || "")) {
        await updateProfile(auth.currentUser, { displayName: name.trim() });
        setDisplayName(name.trim());
      }
      saveProfile({ phone: normalizePhone(phone), instagram: instagram.trim().replace(/^@/, "") });
      setMsg({ tone: "success", text: "Profile saved." });
    } catch {
      setMsg({ tone: "error", text: "Couldn't save your profile. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padded className="sb-account__formcard">
      <form className="sb-auth__form" onSubmit={save}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <Input label="Email" value={user.email || ""} readOnly hint={isGoogle ? "Your email comes from your Google account and cannot be changed here." : "Your login email can't be changed here."} />
        <Input label="Mobile number (optional)" inputMode="numeric" autoComplete="tel" hint="10 digits, with or without +91" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
        <Input label="Instagram username" value={instagram} onChange={(e) => setInstagram(e.target.value)} error={errors.instagram} hint="Required. We message you there about your orders, for example stickbe.co" />
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <div><Button type="submit" loading={busy}>Save profile</Button></div>
      </form>
    </Card>
  );
}

export function AccountHelp() {
  const settings = useSiteSettings();
  return (
    <>
      <PageHead eyebrow="Help" title="Help and contact" lead="Questions about an order, shipping or your account? Reach us any of these ways." />
      <div className="sb-account__actions">
        <Link className="sb-btn sb-btn--primary" to="/#feedback">Contact us</Link>
        <a className="sb-btn sb-btn--secondary" href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">Message on Instagram</a>
        <a className="sb-btn sb-btn--secondary" href={`mailto:${settings.contactEmail}`}>Email us</a>
      </div>
      <p className="sb-account__note">To delete your account and saved data, message us on Instagram or email us and we'll take care of it.</p>
    </>
  );
}

const STATUS_MESSAGE = {
  new: "We are reviewing your request. We will contact you using the details you gave us.",
  fulfilled: "This order has been fulfilled. Thank you for shopping with StickBe!",
};

export function AccountOrderDetail() {
  const { orderId } = useParams();
  const { user } = useAccount();
  const { categories } = useCatalog();
  const [state, setState] = useState({ order: null, loading: true, error: false });

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, "orders", orderId))
      .then((snap) => {
        const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
        if (!cancelled) setState({ order: data && data.userId === user.uid ? data : null, loading: false, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ order: null, loading: false, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, user.uid]);

  const { order, loading, error } = state;
  if (loading) return <Skeleton height={320} style={{ display: "block" }} />;
  if (error) return <Alert tone="error">We couldn't load this order. <Link className="sb-linkbtn sb-linkbtn--strong" to="/account/orders">Back to orders</Link></Alert>;
  if (!order) return <Card><EmptyState title="Order not found" action={<Link className="sb-btn sb-btn--secondary sb-btn--sm" to="/account/orders">All orders</Link>}>We couldn't find that order on your account.</EmptyState></Card>;

  const status = statusOf(order);
  const number = order.orderNumber || orderNumber(order);
  const c = order.customer || {};
  const flat = categories.flatMap((cat) => cat.items);
  const events = [{ label: "Order request received", at: order.createdAt }];
  if ((order.status || "new") === "fulfilled") events.push({ label: "Fulfilled", at: null });

  return (
    <>
      <Link className="sb-linkbtn sb-linkbtn--strong" to="/account/orders">All orders</Link>
      <PageHead eyebrow="Order" title={number} lead={order.createdAt ? `Placed ${formatOrderDate(order.createdAt)}` : undefined} action={<Badge tone={status.tone}>{status.label}</Badge>} />
      <Alert tone="info">{STATUS_MESSAGE[order.status || "new"] || STATUS_MESSAGE.new}</Alert>
      <div className="sb-account__cards sb-orderdetail">
        <Card padded>
          <h3>Items</h3>
          <ul className="sb-summary__items">
            {(order.items || []).map((i, idx) => {
              const p = flat.find((x) => x.slug === i.slug);
              const img = p ? itemImage(p) : null;
              return (
                <li key={idx} className="sb-summary__item">
                  <div className="sb-cartline__img">{img ? <FitImage src={img} alt="" /> : <span className="sb-fit"><span className="sb-fit__missing">&nbsp;</span></span>}</div>
                  <div><strong>{i.name}</strong><div>{i.qty} × ₹{i.price}</div></div>
                  <strong>₹{i.qty * i.price}</strong>
                </li>
              );
            })}
          </ul>
          <dl className="sb-summary__rows">
            <div><dt>Subtotal</dt><dd>₹{order.subtotal}</dd></div>
            <div><dt>Delivery</dt><dd>₹{order.deliveryFee ?? 0}</dd></div>
            <div className="sb-summary__total"><dt>Total</dt><dd>₹{order.total}</dd></div>
          </dl>
        </Card>
        <div className="sb-orderdetail__side">
          <Card padded>
            <h3>Shipping to</h3>
            <p className="sb-addr__text"><strong>{c.name}</strong></p>
            <p className="sb-addr__text">{c.address}</p>
            <p className="sb-addr__text">{c.city}, {c.state} {c.pincode}</p>
            <p className="sb-addr__text">+91 {c.phone}</p>
            {order.note && <p className="sb-addr__text">Note: {order.note}</p>}
          </Card>
          <Card padded>
            <h3>Progress</h3>
            <ol className="sb-timeline">
              {events.map((e) => (
                <li key={e.label}><strong>{e.label}</strong>{e.at ? <span>{formatOrderDate(e.at)}</span> : null}</li>
              ))}
            </ol>
          </Card>
          <p className="sb-account__note">Need help with this order? <Link className="sb-linkbtn sb-linkbtn--strong" to="/account/help">Contact us</Link> and quote {number}.</p>
        </div>
      </div>
    </>
  );
}
