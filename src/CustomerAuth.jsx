import React, { useState, useEffect, useRef } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import { User, X } from "lucide-react";

const LS_CART_KEY = "stickbe_cart";
const LS_WISHLIST_KEY = "stickbe_wishlist";

function loadLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full, private mode, etc - in-memory state still works for this tab
  }
}

function mergeCarts(localCart, cloudCart) {
  const merged = [...cloudCart];
  for (const item of localCart) {
    const existing = merged.find((i) => i.name === item.name);
    if (existing) {
      existing.qty = (existing.qty || 1) + (item.qty || 1);
    } else {
      merged.push(item);
    }
  }
  return merged;
}

function mergeWishlists(localWishlist, cloudWishlist) {
  return Array.from(new Set([...(cloudWishlist || []), ...(localWishlist || [])]));
}


export function useCustomerAccount() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const [cart, setCart] = useState(() => loadLocal(LS_CART_KEY));
  const [wishlist, setWishlist] = useState(() => loadLocal(LS_WISHLIST_KEY));
  const [address, setAddress] = useState(null);

  const hasMerged = useRef(false);
  const saveTimer = useRef(null);
  const cartRef = useRef(cart);
  const wishlistRef = useRef(wishlist);
  cartRef.current = cart;
  wishlistRef.current = wishlist;

 
  useEffect(() => { saveLocal(LS_CART_KEY, cart); }, [cart]);
  useEffect(() => { saveLocal(LS_WISHLIST_KEY, wishlist); }, [wishlist]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthChecked(true);

      if (u && !hasMerged.current) {
        hasMerged.current = true;
        try {
          const ref = doc(db, "users", u.uid);
          const snap = await getDoc(ref);
          const cloud = snap.exists() ? snap.data() : {};
          const mergedCart = mergeCarts(cartRef.current, cloud.cart || []);
          const mergedWishlist = mergeWishlists(wishlistRef.current, cloud.wishlist || []);
          setCart(mergedCart);
          setWishlist(mergedWishlist);
          setAddress(cloud.address || null);
          await setDoc(
            ref,
            { cart: mergedCart, wishlist: mergedWishlist, email: u.email, updatedAt: Date.now() },
            { merge: true }
          );
        } catch {
          // offline or rules issue - local cart still works, just won't sync this time
        }
      }
      if (!u) {
        hasMerged.current = false;
        setAddress(null);
      }
    });
    return unsub;
  }, []);

 
  useEffect(() => {
  if (!user) return;
  if (saveTimer.current) clearTimeout(saveTimer.current);
  saveTimer.current = setTimeout(() => {
    setDoc(doc(db, "users", user.uid), { cart, wishlist, address, updatedAt: Date.now() }, { merge: true }).catch(() => {});
  }, 800);
  return () => clearTimeout(saveTimer.current);
}, [cart, wishlist, address, user]);

  const logOut = () => {
    signOut(auth);
    setAccountOpen(false);
  };

return {
  cart, setCart,
  wishlist, setWishlist,
  address, setAddress,
  user, authChecked,
  authModalOpen, setAuthModalOpen,
  accountOpen, setAccountOpen,
  logOut,
};
}

const inputStyle = {
  width: "100%", padding: "10px 12px", marginTop: 4, borderRadius: 10,
  border: "1px solid #ddd", fontFamily: "'Nunito', sans-serif", fontSize: 14, boxSizing: "border-box",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
  );
}

const ERROR_MESSAGES = {
  "auth/email-already-in-use": "That email already has an account - try logging in instead.",
  "auth/invalid-email": "That doesn't look like a valid email.",
  "auth/weak-password": "Password should be at least 6 characters.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "No account found with that email.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/popup-closed-by-user": "Sign-in was closed before finishing.",
};

const ADDRESS_FIELDS = [
  { key: "name", label: "Full name" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "pincode", label: "Pincode" },
];

export function AccountPanel({ open, onClose, user, address, onSaveAddress, onLogOut, theme }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(address || {});

  useEffect(() => {
    setForm(address || {});
  }, [address, open]);

  if (!open || !user) return null;

  const handleField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = () => {
  onSaveAddress(form);
  setDoc(doc(db, "users", user.uid), { address: form, updatedAt: Date.now() }, { merge: true }).catch(() => {});
  setEditing(false);
};

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(63,43,87,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: theme.surface, borderRadius: 18, maxWidth: 360, width: "100%", padding: "28px 24px", position: "relative", textAlign: "center", maxHeight: "85vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: theme.bodyMuted }} aria-label="Close">
          <X size={18} />
        </button>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <User size={36} style={{ color: theme.heading }} />
        </div>
        <p style={{ fontFamily: "'Baloo 2', sans-serif", color: theme.heading, fontSize: 18, margin: "0 0 2px" }}>
          {user.displayName || "Your account"}
        </p>
        <p style={{ color: theme.bodyMuted, fontSize: 13, margin: "0 0 20px" }}>{user.email}</p>

        <div style={{ textAlign: "left", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p style={{ fontFamily: "'Baloo 2', sans-serif", color: theme.heading, fontSize: 14, margin: 0 }}>
              Saved address
            </p>
            <button
              onClick={() => setEditing((e) => !e)}
              style={{ background: "none", border: "none", color: theme.heading, cursor: "pointer", fontSize: 12, fontWeight: 700, textDecoration: "underline" }}
            >
              {editing ? "Cancel" : address ? "Edit" : "Add"}
            </button>
          </div>

          {editing ? (
            <>
              {ADDRESS_FIELDS.map(({ key, label }) => (
                <label key={key} style={{ fontSize: 12, color: theme.bodyMuted, display: "block", marginTop: 8 }}>
                  {label}
                  <input value={form[key] || ""} onChange={handleField(key)} style={inputStyle} />
                </label>
              ))}
              <button
                onClick={handleSave}
                className="stickbe-order-btn"
                style={{ width: "100%", justifyContent: "center", marginTop: 14, border: "none", cursor: "pointer" }}
              >
                Save address
              </button>
            </>
          ) : address ? (
            <p style={{ color: theme.bodyMuted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              {address.name}<br />
              {address.address}, {address.city}, {address.state} - {address.pincode}<br />
              {address.phone}
            </p>
          ) : (
            <p style={{ color: theme.bodyMuted, fontSize: 13, margin: 0 }}>
              No address saved yet — it'll also save automatically next time you check out.
            </p>
          )}
        </div>

        <button
          onClick={onLogOut}
          style={{ padding: "10px 20px", borderRadius: 10, background: "#eee", border: "none", cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: theme.heading }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
export function AccountIcon({ user, theme, onOpenAuth, onOpenAccount }) {
  return (
    <button
      onClick={() => (user ? onOpenAccount() : onOpenAuth())}
      style={{ color: theme.heading, background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", position: "relative" }}
      aria-label={user ? "Account" : "Sign in"}
    >
      <User size={19} strokeWidth={2.2} />
      {user && (
        <span
          style={{
            position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%",
            background: "#4CAF50", border: `2px solid ${theme.surface}`,
          }}
        />
      )}
    </button>
  );
}
export function AuthModal({ open, onClose, theme }) {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "reset"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const clearMessages = () => { setError(""); setInfo(""); };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    clearMessages();
    setBusy(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    clearMessages();
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || "Google sign-in didn't go through. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    clearMessages();
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo("Check your email for a reset link.");
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || "Couldn't send that - check the email address.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(63,43,87,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: theme.surface, borderRadius: 18, maxWidth: 380, width: "100%", padding: "28px 24px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: theme.bodyMuted }} aria-label="Close">
          <X size={18} />
        </button>

        <p style={{ fontFamily: "'Baloo 2', sans-serif", color: theme.heading, fontSize: 19, margin: "0 0 4px" }}>
          {mode === "signup" ? "Create an account" : mode === "reset" ? "Reset password" : "Welcome back"}
        </p>
        <p style={{ color: theme.bodyMuted, fontSize: 13, margin: "0 0 18px" }}>
          {mode === "signup"
            ? "Save your cart and wishlist across devices."
            : mode === "reset"
            ? "We'll email you a link to reset it."
            : "Log in to pick up your cart and wishlist."}
        </p>

        {mode !== "reset" && (
          <>
            <button
              onClick={handleGoogle}
              disabled={busy}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 14, marginBottom: 14 }}
            >
                <GoogleIcon />
                 Continue with Google
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 14px", color: theme.bodyMuted, fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: "#e5e5e5" }} />
              or
              <div style={{ flex: 1, height: 1, background: "#e5e5e5" }} />
            </div>
          </>
        )}

        <form onSubmit={mode === "reset" ? handleReset : handleEmailAuth}>
          {mode === "signup" && (
            <label style={{ fontSize: 13, color: theme.heading, display: "block" }}>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            </label>
          )}
          <label style={{ fontSize: 13, color: theme.heading, display: "block", marginTop: mode === "signup" ? 10 : 0 }}>
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </label>
          {mode !== "reset" && (
            <label style={{ fontSize: 13, color: theme.heading, display: "block", marginTop: 10 }}>
              Password
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            </label>
          )}

          {error && <p style={{ color: "#c0392b", fontSize: 13, marginTop: 10 }}>{error}</p>}
          {info && <p style={{ color: "#2e7d32", fontSize: 13, marginTop: 10 }}>{info}</p>}

          <button type="submit" disabled={busy} className="stickbe-order-btn" style={{ width: "100%", justifyContent: "center", marginTop: 16, border: "none", cursor: "pointer" }}>
            {busy ? "Please wait..." : mode === "signup" ? "Sign up" : mode === "reset" ? "Send reset link" : "Log in"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
          {mode === "login" && (
            <>
              <button onClick={() => { clearMessages(); setMode("reset"); }} style={{ background: "none", border: "none", color: theme.bodyMuted, cursor: "pointer", textDecoration: "underline" }}>
                Forgot password?
              </button>
              <p style={{ margin: "10px 0 0", color: theme.heading }}>
                New here?{" "}
                <button onClick={() => { clearMessages(); setMode("signup"); }} style={{ background: "none", border: "none", color: theme.heading, cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>
                  Sign up
                </button>
              </p>
            </>
          )}
          {mode === "signup" && (
            <p style={{ margin: 0, color: theme.heading }}>
              Already have an account?{" "}
              <button onClick={() => { clearMessages(); setMode("login"); }} style={{ background: "none", border: "none", color: theme.heading, cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>
                Log in
              </button>
            </p>
          )}
          {mode === "reset" && (
            <button onClick={() => { clearMessages(); setMode("login"); }} style={{ background: "none", border: "none", color: theme.bodyMuted, cursor: "pointer", textDecoration: "underline" }}>
              Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
