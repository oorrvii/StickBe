import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Alert, Button, Card, Input, Select, Skeleton, Textarea } from "../ui/index.js";
import { useAccount } from "../app/AccountContext.jsx";
import { useCatalog } from "../shop/CatalogContext.jsx";
import { INDIAN_STATES, normalizePhone } from "../app/addressUtils.js";
import OrderSummary from "./OrderSummary.jsx";
import { notifyShop } from "./notify.js";
import { resolveLines, summarize } from "./cartLogic.js";
import "./cart.css";

const EMPTY = { name: "", email: "", phone: "", altPhone: "", instagram: "", address1: "", address2: "", landmark: "", city: "", state: "", pincode: "", note: "" };

function newRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function fromSaved(a, profile, user) {
  return {
    ...EMPTY,
    name: a?.fullName || user?.displayName || "",
    email: user?.email || "",
    phone: a?.phone || profile.phone || "",
    instagram: profile.instagram || "",
    address1: a?.line1 || "",
    address2: a?.line2 || "",
    landmark: a?.landmark || "",
    city: a?.city || "",
    state: a?.state || "",
    pincode: a?.pincode || "",
  };
}

function validate(f) {
  const e = {};
  if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(f.name.trim())) e.name = "Enter your full name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = "Enter a valid email";
  if (normalizePhone(f.phone).length !== 10) e.phone = "Enter a 10-digit mobile number";
  if (f.altPhone && normalizePhone(f.altPhone).length !== 10) e.altPhone = "Enter a 10-digit number";
  if (!/^[A-Za-z0-9._]{1,40}$/.test(f.instagram.trim().replace(/^@/, ""))) e.instagram = "Enter your Instagram username";
  if (!f.address1.trim()) e.address1 = "Enter your house or flat number and street";
  if (!/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(f.city.trim())) e.city = "Enter your city or town";
  if (!f.state) e.state = "Choose a state";
  if (!/^\d{6}$/.test(f.pincode.trim())) e.pincode = "Enter a 6-digit PIN code";
  return e;
}

function CheckoutForm({ discountPercent, onPlaced }) {
  const { cart, setCart, user, addresses, profile, setAddress } = useAccount();
  const { categories, reload } = useCatalog();
  const navigate = useNavigate();
  const defaultSaved = addresses.find((a) => a.isDefault) || addresses[0];
  const [form, setForm] = useState(() => fromSaved(defaultSaved, profile, user));
  const [savedId, setSavedId] = useState(defaultSaved?.id || "");
  const [errors, setErrors] = useState({});
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const [requestId] = useState(newRequestId);

  const lines = resolveLines(cart, categories, discountPercent);
  const s = summarize(lines, form.city.trim());

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
    error: errors[key],
  });

  const pickSaved = (id) => {
    setSavedId(id);
    const a = addresses.find((x) => x.id === id);
    if (a) setForm((f) => ({ ...fromSaved(a, profile, user), email: f.email || user?.email || "", instagram: f.instagram || profile.instagram || "", note: f.note }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setProblem(null);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      setProblem({ tone: "warning", text: "Please fix the highlighted fields." });
      return;
    }
    if (!agree) {
      setProblem({ tone: "warning", text: "Please tick the box to confirm you understand how ordering works." });
      return;
    }
    setBusy(true);
    try {
      const token = user ? await user.getIdToken() : null;
      const res = await fetch("/api/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          requestId,
          items: lines.map((l) => ({ slug: l.slug, variantLabel: l.variantLabel, qty: l.qty })),
          customer: { ...form, note: undefined },
          note: form.note,
          discountPercent,
          expectedTotal: s.total,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.problems) setErrors(data.problems);
        if (["PRICES_CHANGED", "OUT_OF_STOCK", "ITEM_UNAVAILABLE", "BELOW_MINIMUM", "EMPTY_CART", "BAD_ITEM"].includes(data.error)) reload();
        setProblem({ tone: "error", text: data.message || "We couldn't send your order. Please try again.", cartLink: data.error && data.error !== "INVALID_DETAILS" && data.error !== "BAD_LOGIN" });
        return;
      }
      notifyShop(data.order);
      if (user) setAddress({ ...form, name: form.name, address: form.address1 });
      try {
        sessionStorage.setItem("stickbe_last_order", JSON.stringify(data.order));
      } catch {
        // private mode: the confirmation page still gets it through navigation
      }
      onPlaced();
      setCart([]);
      navigate(`/order-confirmation/${data.orderNumber}`, { state: { order: data.order }, replace: true });
    } catch {
      setProblem({ tone: "error", text: "We couldn't reach the server. Check your connection and try again. Your cart is safe." });
    } finally {
      setBusy(false);
    }
  };

  const summaryLines = lines.map((l) => ({ key: l.rawKey, name: l.name, qty: l.qty, price: l.unit, image: l.image }));
  const blocked = lines.length === 0 || s.hasProblems || !s.meetsMinimum;

  return (
    <form className="sb-checkout" onSubmit={submit} noValidate>
      <div className="sb-checkout__main">
        <Card padded>
          <h2>Contact and shipping</h2>
          {!user && <p className="sb-summary__note"><Link className="sb-linkbtn sb-linkbtn--strong" to="/sign-in?next=/checkout">Log in</Link> to fill this in from your saved details and track the order.</p>}
          <div className="sb-auth__form">
            {addresses.length > 1 && (
              <Select label="Use a saved address" value={savedId} onChange={(e) => pickSaved(e.target.value)}>
                {addresses.map((a) => <option key={a.id} value={a.id}>{a.fullName}, {a.line1}, {a.city}</option>)}
              </Select>
            )}
            <div className="sb-account__row">
              <Input label="Full name" autoComplete="name" {...field("name")} />
              <Input label="Mobile number" inputMode="numeric" autoComplete="tel" hint="10 digits, with or without +91" {...field("phone")} />
            </div>
            <div className="sb-account__row">
              <Input label="Email" type="email" autoComplete="email" hint="We use this email to reach you about the order." {...field("email")} />
              <Input label="Alternate mobile (optional)" inputMode="numeric" {...field("altPhone")} />
            </div>
            <Input label="Address line 1" autoComplete="address-line1" hint="House or flat number, building, street" {...field("address1")} />
            <Input label="Address line 2 (optional)" autoComplete="address-line2" {...field("address2")} />
            <div className="sb-account__row">
              <Input label="Landmark (optional)" {...field("landmark")} />
              <Input label="City or town" autoComplete="address-level2" {...field("city")} />
            </div>
            <div className="sb-account__row">
              <Select label="State" autoComplete="address-level1" {...field("state")}>
                <option value="">Choose a state</option>
                {INDIAN_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
              </Select>
              <Input label="PIN code" inputMode="numeric" autoComplete="postal-code" {...field("pincode")} />
            </div>
            <Input label="Country" value="India" readOnly hint="We currently ship within India only." />
            <Input label="Instagram username" hint="Required. We message you there about your order, for example stickbe.co" {...field("instagram")} />
          </div>
        </Card>

        <Card padded>
          <h2>Note for us (optional)</h2>
          <div className="sb-auth__form">
            <Textarea label="Anything we should know?" className="sb-checkout__textarea" maxLength={500} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            <p className="sb-checkout__count">{form.note.length} of 500 characters</p>
          </div>
        </Card>

        <Card padded>
          <h2>How payment works</h2>
          <p className="sb-summary__note">
            After you send this request we check it and contact you. Only then do we send payment details. Orders are prepaid, Cash on Delivery is not available, and nothing is charged on this website.
          </p>
          <label className="sb-auth__show">
            <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setProblem(null); }} />
            I understand this is an order request and that I pay only after StickBe contacts me.
          </label>
        </Card>

        {problem && (
          <Alert tone={problem.tone}>
            {problem.text} {problem.cartLink && <Link className="sb-linkbtn sb-linkbtn--strong" to="/cart">Review your cart</Link>}
          </Alert>
        )}
        {!s.meetsMinimum && lines.length > 0 && <Alert tone="warning">Add ₹{s.shortBy} more to reach the ₹99 minimum order.</Alert>}
        {s.hasProblems && <Alert tone="warning">Some items in your cart need attention. <Link className="sb-linkbtn sb-linkbtn--strong" to="/cart">Review your cart</Link></Alert>}

        <div className="sb-account__actions">
          <Button type="submit" size="lg" loading={busy} disabled={blocked}>Submit order request</Button>
          <Link className="sb-btn sb-btn--ghost" to="/cart">Back to cart</Link>
        </div>
      </div>

      <aside>
        <OrderSummary
          lines={summaryLines}
          subtotal={s.subtotal}
          deliveryFee={s.deliveryFee}
          total={s.total}
          footnote="Delivery is ₹40, or ₹20 within Agra. Nothing is charged on this website."
        />
      </aside>
    </form>
  );
}

export default function CheckoutPage({ discountPercent }) {
  const { cart, authChecked, user, addresses } = useAccount();
  const { loading } = useCatalog();
  const [placed, setPlaced] = useState(false);

  if (!authChecked || loading) {
    return (
      <div className="sb-page">
        <h1>Checkout</h1>
        <Skeleton height={320} style={{ display: "block", marginTop: 24 }} />
      </div>
    );
  }
  if (placed) return null;
  if (cart.length === 0) return <Navigate to="/cart" replace />;

  return (
    <div className="sb-page">
      <h1>Checkout</h1>
      <p className="sb-account__lead">You are sending us an order request. We review it, then contact you with payment details. You do not pay on this page.</p>
      <CheckoutForm key={`${user ? user.uid : "guest"}:${addresses.length}`} discountPercent={discountPercent} onPlaced={() => setPlaced(true)} />
    </div>
  );
}
