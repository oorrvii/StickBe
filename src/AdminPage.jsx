import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { auth, db } from "./firebase";
import { CATEGORY_META } from "./categoryMeta.js";

const PLUM = "#5B3E7F";
const PEACH = "#F0B48A";
const CREAM = "#FDF6EC";
const SURFACE = "#ffffff";
const BODY_MUTED = "#8a7a97";
const BORDER = "#eee3f0";

const FONT_HEAD = "'Baloo 2', sans-serif";
const FONT_BODY = "'Nunito', sans-serif";

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  marginTop: 4,
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  fontFamily: FONT_BODY,
  fontSize: 14,
  boxSizing: "border-box",
};

const labelStyle = { fontSize: 13, color: PLUM, fontWeight: 600, display: "block" };

const buttonBase = {
  padding: "9px 16px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontFamily: FONT_BODY,
  fontWeight: 700,
  fontSize: 13.5,
};

const primaryBtn = { ...buttonBase, background: PLUM, color: "#fff" };
const peachBtn = { ...buttonBase, background: PEACH, color: "#fff" };
const ghostBtn = { ...buttonBase, background: "#f3ecf7", color: PLUM };
const dangerBtn = { ...buttonBase, background: "#fdeaea", color: "#c0392b" };

function GlobalStyle() {
  return (
    <style>{`
      .admin-wrap { font-family: ${FONT_BODY}; background: ${CREAM}; min-height: 100vh; }
      .admin-shell { max-width: 1100px; margin: 0 auto; padding: 16px; }
      @media (min-width: 640px) { .admin-shell { padding: 28px 24px; } }
      .admin-card { background: ${SURFACE}; border: 1px solid ${BORDER}; border-radius: 16px; }
      .product-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 14px;
      }
      .product-card-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
      .admin-tab { background: none; border: none; cursor: pointer; font-family: ${FONT_HEAD}; font-size: 15px; padding: 10px 4px; color: ${BODY_MUTED}; border-bottom: 3px solid transparent; }
      .admin-tab.active { color: ${PLUM}; border-bottom-color: ${PEACH}; }
      .order-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
      @media (min-width: 760px) { .order-grid { grid-template-columns: 1fr 1fr; } }
      input:focus, select:focus { outline: 2px solid ${PEACH}; outline-offset: 1px; }
    `}</style>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError("Incorrect email or password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <GlobalStyle />
      <div className="admin-card" style={{ maxWidth: 360, width: "100%", padding: "32px 26px" }}>
        <p style={{ fontFamily: FONT_HEAD, color: PLUM, fontSize: 22, margin: "0 0 4px", textAlign: "center" }}>
          StickBe Admin
        </p>
        <p style={{ color: BODY_MUTED, fontSize: 13.5, margin: "0 0 22px", textAlign: "center" }}>
          Log in to manage products and orders.
        </p>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
          </label>
          <label style={{ ...labelStyle, marginTop: 12 }}>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required />
          </label>
          {error && <p style={{ color: "#c0392b", fontSize: 13, marginTop: 10 }}>{error}</p>}
          <button type="submit" disabled={busy} style={{ ...primaryBtn, width: "100%", marginTop: 18, padding: "11px 16px" }}>
            {busy ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}

const emptyForm = {
  name: "",
  price: "",
  image: "",
  slug: "",
  category: CATEGORY_META[0].id,
  order: 0,
  inStock: true,
  stock: "",
};

function ProductForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => {
  if (!initial) return { ...emptyForm, extraImages: [] };
  const images = Array.isArray(initial.images) ? initial.images : [];
  let mainImage = initial.image;
  let extra;
  if (!mainImage && images.length > 0) {
    mainImage = images[0];
    extra = images.slice(1);
  } else {
    extra = images.filter((img) => img !== mainImage);
  }
  return { ...emptyForm, ...initial, image: mainImage || "", extraImages: extra };
});
  const isEditing = Boolean(initial);

  const update = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const updateExtraImage = (idx) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = [...f.extraImages];
      next[idx] = value;
      return { ...f, extraImages: next };
    });
  };
  const addExtraImage = () => setForm((f) => ({ ...f, extraImages: [...f.extraImages, ""] }));
  const removeExtraImage = (idx) =>
    setForm((f) => ({ ...f, extraImages: f.extraImages.filter((_, i) => i !== idx) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanExtra = form.extraImages.map((s) => s.trim()).filter(Boolean);
    const { extraImages, ...rest } = form;
    onSave({
      ...rest,
      price: Number(form.price),
      order: Number(form.order),
      stock: form.stock === "" ? null : Number(form.stock),
      images: cleanExtra.length > 0 ? [form.image, ...cleanExtra] : null,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="admin-card"
      style={{ display: "flex", flexDirection: "column", gap: 12, padding: "20px 18px", marginBottom: 18 }}
    >
      <p style={{ fontFamily: FONT_HEAD, color: PLUM, fontSize: 17, margin: 0 }}>
        {isEditing ? "Edit product" : "Add a new product"}
      </p>

      <label style={labelStyle}>
        Name
        <input value={form.name} onChange={update("name")} required style={inputStyle} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={labelStyle}>
          Price (₹)
          <input type="number" value={form.price} onChange={update("price")} required style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Order (lower shows first)
          <input type="number" value={form.order} onChange={update("order")} style={inputStyle} />
        </label>
      </div>

            <label style={labelStyle}>
        Main image path
        <input value={form.image} onChange={update("image")} required style={inputStyle} placeholder="/products/cute-cat.jpg" />
        <small style={{ color: BODY_MUTED, fontWeight: 400 }}>Upload the file to public/products via git first. This is the thumbnail and first photo shown.</small>
      </label>

      <div>
        <span style={labelStyle}>Additional images (optional — for items like sticker packs with more than one photo)</span>
        {form.extraImages.map((img, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input
              value={img}
              onChange={updateExtraImage(idx)}
              style={{ ...inputStyle, marginTop: 0 }}
              placeholder="/products/cute-cat-2.jpg"
            />
            <button type="button" onClick={() => removeExtraImage(idx)} style={{ ...dangerBtn, padding: "8px 12px" }}>✕</button>
          </div>
        ))}
        <button type="button" onClick={addExtraImage} style={{ ...ghostBtn, marginTop: 8 }}>+ Add another image</button>
      </div>

      <label style={labelStyle}>
        Slug (unique, used in the product URL)
        <input
          value={form.slug}
          onChange={update("slug")}
          required
          disabled={isEditing}
          style={{ ...inputStyle, background: isEditing ? "#f3f3f3" : "#fff" }}
        />
        {isEditing && <small style={{ color: BODY_MUTED, fontWeight: 400 }}>Can't be changed here — delete and re-add for a new slug.</small>}
      </label>

      <label style={labelStyle}>
        Category
        <select value={form.category} onChange={update("category")} style={inputStyle}>
          {CATEGORY_META.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>
        Stock count (leave blank for unlimited / not tracked)
        <input type="number" min="0" value={form.stock} onChange={update("stock")} style={inputStyle} />
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: PLUM, fontWeight: 600 }}>
        <input type="checkbox" checked={form.inStock} onChange={update("inStock")} />
        In stock (manual override — use to pause a listing regardless of count)
      </label>

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button type="submit" style={primaryBtn}>Save</button>
        <button type="button" onClick={onCancel} style={ghostBtn}>Cancel</button>
      </div>
    </form>
  );
}

function ProductCard({ p, onToggleStock, onEdit, onDelete }) {
  const effectiveInStock = p.inStock && (typeof p.stock !== "number" || p.stock > 0);
  return (
    <div className="admin-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <img
          src={p.image}
          alt={p.name}
          style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10, flexShrink: 0, background: CREAM }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: PLUM, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {p.name}
          </div>
          <div style={{ fontSize: 12.5, color: BODY_MUTED, marginTop: 2 }}>
            {p.categoryLabel || p.category} · ₹{p.price} · order {p.order ?? "—"}
          </div>
          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 11.5, fontWeight: 700, padding: "2px 9px", borderRadius: 100,
              background: effectiveInStock ? "#e4f3e4" : "#fdeaea",
              color: effectiveInStock ? "#2e7d32" : "#c0392b",
            }}>
              {effectiveInStock ? "In stock" : "Out of stock"}
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: "2px 9px", borderRadius: 100, background: "#f3ecf7", color: PLUM }}>
              {typeof p.stock === "number" ? `${p.stock} left` : "unlimited"}
            </span>
          </div>
        </div>
      </div>
      <div className="product-card-actions">
        <button onClick={() => onToggleStock(p)} style={ghostBtn}>
          {p.inStock ? "Mark sold out" : "Mark in stock"}
        </button>
        <button onClick={() => onEdit(p)} style={ghostBtn}>Edit</button>
        <button onClick={() => onDelete(p.id)} style={dangerBtn}>Delete</button>
      </div>
    </div>
  );
}

function ProductsView() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");

  const loadProducts = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, "products"));
    const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    all.sort((a, b) => (a.category || "").localeCompare(b.category || "") || (a.order ?? 0) - (b.order ?? 0));
    setProducts(all);
    setLoading(false);
  };

  useEffect(() => { loadProducts(); }, []);

  const handleSave = async (data) => {
    const meta = CATEGORY_META.find((c) => c.id === data.category);
    const payload = { ...data, categoryLabel: meta?.label || data.category, aspectRatio: meta?.aspectRatio || null };
    await setDoc(doc(db, "products", data.slug), payload, { merge: true });
    setEditing(null);
    loadProducts();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product? This can't be undone.")) return;
    await deleteDoc(doc(db, "products", id));
    loadProducts();
  };

  const toggleStock = async (p) => {
    await updateDoc(doc(db, "products", p.id), { inStock: !p.inStock });
    loadProducts();
  };

  const visibleProducts = products
    .filter((p) => filterCategory === "all" || p.category === filterCategory)
    .filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div>
      {editing === "new" && <ProductForm onSave={handleSave} onCancel={() => setEditing(null)} />}
      {editing && editing !== "new" && (
        <ProductForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
      )}

      {!editing && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" }}>
          <button onClick={() => setEditing("new")} style={peachBtn}>+ Add product</button>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ ...inputStyle, marginTop: 0, width: "auto", minWidth: 160 }}>
            <option value="all">All categories</option>
            {CATEGORY_META.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, marginTop: 0, width: "auto", flex: "1 1 200px" }}
          />
          <span style={{ fontSize: 13, color: BODY_MUTED }}>{visibleProducts.length} shown</span>
        </div>
      )}

      {loading ? (
        <p style={{ color: BODY_MUTED }}>Loading products...</p>
      ) : (
        <div className="product-grid">
          {visibleProducts.map((p) => (
            <ProductCard key={p.id} p={p} onToggleStock={toggleStock} onEdit={setEditing} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onToggleStatus }) {
  const c = order.customer || {};
  const isFulfilled = order.status === "fulfilled";
  return (
    <div className="admin-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, color: PLUM, fontSize: 15 }}>{c.name || "Unknown customer"}</div>
          <div style={{ fontSize: 12.5, color: BODY_MUTED }}>
            {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
          </div>
        </div>
        <span style={{
          fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 100, whiteSpace: "nowrap",
          background: isFulfilled ? "#e4f3e4" : "#fff4e0",
          color: isFulfilled ? "#2e7d32" : "#b5790a",
        }}>
          {isFulfilled ? "Fulfilled" : "New"}
        </span>
      </div>

      <div style={{ fontSize: 13, color: PLUM, lineHeight: 1.5 }}>
        {c.phone && <div>📞 {c.phone}</div>}
        {c.address && <div>📍 {c.address}, {c.city}, {c.state} - {c.pincode}</div>}
        {c.instagram && <div>📸 {c.instagram}</div>}
      </div>

      <div style={{ borderTop: `1px dashed ${BORDER}`, paddingTop: 10 }}>
        {(order.items || []).map((i, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: BODY_MUTED, marginBottom: 3 }}>
            <span>{i.name} × {i.qty}</span>
            <span>₹{i.price * i.qty}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6 }}>
        <span style={{ fontFamily: FONT_HEAD, color: PLUM, fontSize: 16 }}>Total ₹{order.total}</span>
        <button onClick={() => onToggleStatus(order)} style={isFulfilled ? ghostBtn : peachBtn}>
          {isFulfilled ? "Mark as new" : "Mark fulfilled"}
        </button>
      </div>
    </div>
  );
}

function OrdersView() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  const loadOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setOrders(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load orders:", err);
    }
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, []);

  const toggleStatus = async (order) => {
    const nextStatus = order.status === "fulfilled" ? "new" : "fulfilled";
    await updateDoc(doc(db, "orders", order.id), { status: nextStatus });
    loadOrders();
  };

  const visibleOrders = orders.filter((o) => filterStatus === "all" || (o.status || "new") === filterStatus);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle, marginTop: 0, width: "auto", minWidth: 160 }}>
          <option value="all">All orders</option>
          <option value="new">New</option>
          <option value="fulfilled">Fulfilled</option>
        </select>
        <span style={{ fontSize: 13, color: BODY_MUTED }}>{visibleOrders.length} shown</span>
      </div>

      {loading ? (
        <p style={{ color: BODY_MUTED }}>Loading orders...</p>
      ) : visibleOrders.length === 0 ? (
        <p style={{ color: BODY_MUTED }}>No orders here yet.</p>
      ) : (
        <div className="order-grid">
          {visibleOrders.map((o) => (
            <OrderCard key={o.id} order={o} onToggleStatus={toggleStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [tab, setTab] = useState("products");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCheckingAuth(false);
    });
    return unsub;
  }, []);

  if (checkingAuth) return null;
  if (!user) return <AdminLogin />;

  return (
    <div className="admin-wrap">
      <GlobalStyle />
      <div className="admin-shell">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 10, flexWrap: "wrap" }}>
          <p style={{ fontFamily: FONT_HEAD, color: PLUM, fontSize: 22, margin: 0 }}>StickBe Admin</p>
          <button onClick={() => signOut(auth)} style={ghostBtn}>Log out</button>
        </div>

        <div style={{ display: "flex", gap: 20, borderBottom: `1px solid ${BORDER}`, marginBottom: 18 }}>
          <button className={`admin-tab ${tab === "products" ? "active" : ""}`} onClick={() => setTab("products")}>
            Products
          </button>
          <button className={`admin-tab ${tab === "orders" ? "active" : ""}`} onClick={() => setTab("orders")}>
            Orders
          </button>
        </div>

        {tab === "products" ? <ProductsView /> : <OrdersView />}
      </div>
    </div>
  );
}
