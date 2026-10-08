import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { CATEGORY_META } from "./categoryMeta.js";

const inputStyle = { width: "100%", padding: 8, marginTop: 4, borderRadius: 6, border: "1px solid #ccc" };
const buttonStyle = { padding: "10px 20px", borderRadius: 8, background: "#5B3E7F", color: "#fff", border: "none", cursor: "pointer" };

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError("Incorrect email or password.");
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 24, fontFamily: "'Nunito', sans-serif" }}>
      <h2 style={{ marginBottom: 16 }}>Admin Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ ...inputStyle, marginBottom: 10 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ ...inputStyle, marginBottom: 10 }}
        />
        {error && <p style={{ color: "red", fontSize: 13 }}>{error}</p>}
        <button type="submit" style={{ ...buttonStyle, width: "100%" }}>Log in</button>
      </form>
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
  const [form, setForm] = useState(initial ? { ...emptyForm, ...initial } : emptyForm);
  const isEditing = Boolean(initial);

  const update = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

 const handleSubmit = (e) => {
  e.preventDefault();
  onSave({
    ...form,
    price: Number(form.price),
    order: Number(form.order),
    stock: form.stock === "" ? null : Number(form.stock),
  });
};

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, border: "1px solid #ddd", borderRadius: 10, marginBottom: 16 }}>
      <label>Name
        <input value={form.name} onChange={update("name")} required style={inputStyle} />
      </label>
      <label>Price (₹)
        <input type="number" value={form.price} onChange={update("price")} required style={inputStyle} />
      </label>
      <label>Image path (e.g. /products/cute-cat.jpg — upload the file to public/products via git first)
        <input value={form.image} onChange={update("image")} required style={inputStyle} />
      </label>
      <label>Slug (unique, used in the product URL — e.g. cute-cat-sticker)
        <input
          value={form.slug}
          onChange={update("slug")}
          required
          disabled={isEditing}
          style={{ ...inputStyle, background: isEditing ? "#f3f3f3" : "#fff" }}
        />
        {isEditing && (
          <small style={{ color: "#777" }}>Slug can't be changed here — delete and re-add if you need a new one.</small>
        )}
      </label>
      <label>Category
        <select value={form.category} onChange={update("category")} style={inputStyle}>
          {CATEGORY_META.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </label>
      <label>Order (position within category — lower numbers show first)
        <input type="number" value={form.order} onChange={update("order")} style={inputStyle} />
      </label>
      <label>Stock count (leave blank for unlimited/not tracked)
  <input type="number" min="0" value={form.stock} onChange={update("stock")} style={inputStyle} />
</label>
<label style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <input type="checkbox" checked={form.inStock} onChange={update("inStock")} />
  In stock (manual override — use to pause a listing regardless of count)
</label>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" style={buttonStyle}>Save</button>
        <button type="button" onClick={onCancel} style={{ ...buttonStyle, background: "#aaa" }}>Cancel</button>
      </div>
    </form>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null, "new", or a product object
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCheckingAuth(false);
    });
    return unsub;
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, "products"));
    const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    all.sort(
      (a, b) =>
        (a.category || "").localeCompare(b.category || "") || (a.order ?? 0) - (b.order ?? 0)
    );
    setProducts(all);
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadProducts();
  }, [user]);

  if (checkingAuth) return null;
  if (!user) return <AdminLogin />;

  const handleSave = async (data) => {
    const meta = CATEGORY_META.find((c) => c.id === data.category);
    const payload = {
      ...data,
      categoryLabel: meta?.label || data.category,
      aspectRatio: meta?.aspectRatio || null,
    };
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

  const visibleProducts =
    filterCategory === "all" ? products : products.filter((p) => p.category === filterCategory);

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 16, fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2>StickBe Admin</h2>
        <button onClick={() => signOut(auth)} style={{ ...buttonStyle, background: "#999" }}>Log out</button>
      </div>

      {editing === "new" && <ProductForm onSave={handleSave} onCancel={() => setEditing(null)} />}
      {editing && editing !== "new" && (
        <ProductForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
      )}

      {!editing && (
        <button onClick={() => setEditing("new")} style={{ ...buttonStyle, marginBottom: 16 }}>
          + Add product
        </button>
      )}

      <div style={{ marginBottom: 16 }}>
        <label>Filter by category: </label>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ padding: 6, borderRadius: 6 }}
        >
          <option value="all">All</option>
          {CATEGORY_META.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading products...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visibleProducts.map((p) => (
            <div
              key={p.id}
              style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #eee", borderRadius: 8, padding: 10 }}
            >
              <img src={p.image} alt={p.name} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: "#777" }}>
  {p.categoryLabel || p.category} · ₹{p.price} · order {p.order ?? "—"} ·{" "}
  {typeof p.stock === "number" ? `${p.stock} left` : "unlimited"} ·{" "}
  {p.inStock && (typeof p.stock !== "number" || p.stock > 0) ? "In stock" : "Out of stock"}
</div>
              </div>
              <button onClick={() => toggleStock(p)} style={{ ...buttonStyle, padding: "6px 12px", fontSize: 13 }}>
                {p.inStock ? "Mark sold out" : "Mark in stock"}
              </button>
              <button onClick={() => setEditing(p)} style={{ ...buttonStyle, padding: "6px 12px", fontSize: 13 }}>
                Edit
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                style={{ ...buttonStyle, padding: "6px 12px", fontSize: 13, background: "#c0392b" }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
