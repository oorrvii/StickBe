import { useState, useEffect, useRef, useMemo } from "react";
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
import { User } from "lucide-react";
import { Button, Input, Alert } from "./ui/index.js";
import "./account/account.css";
import { withSingleDefault, legacyToAddress, checkoutPrefill, newAddressId, normalizePhone } from "./app/addressUtils.js";

const LS_CART_KEY = "stickbe_cart";
const LS_WISHLIST_KEY = "stickbe_wishlist";
const LS_OWNER_KEY = "stickbe_cart_owner";

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

function readOwner() {
  try {
    return localStorage.getItem(LS_OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(uid) {
  try {
    if (uid) localStorage.setItem(LS_OWNER_KEY, uid);
    else localStorage.removeItem(LS_OWNER_KEY);
  } catch {
    // ignore
  }
}

function mergeCarts(localCart, cloudCart, sameOwner) {
  const merged = cloudCart.map((i) => ({ ...i }));
  for (const item of localCart) {
    const existing = merged.find((i) => i.name === item.name);
    if (existing) {
      existing.qty = sameOwner
        ? Math.max(existing.qty || 1, item.qty || 1)
        : (existing.qty || 1) + (item.qty || 1);
    } else {
      merged.push(item);
    }
  }
  return merged;
}

function mergeWishlists(localWishlist, cloudWishlist) {
  return Array.from(new Set([...(cloudWishlist || []), ...(localWishlist || [])]));
}

/**
 * Drop-in replacement for the old `useState([])` cart/wishlist pair.
 * - Guests: cart/wishlist persist in localStorage (survives closing the tab).
 * - Signed-in customers: cart/wishlist also sync to Firestore under
 *   users/{uid}, so they follow the customer across devices.
 * - On sign-in, whatever was sitting in the guest cart gets merged into
 *   their account cart rather than overwritten or lost.
 */
export function useCustomerAccount() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const [cart, setCart] = useState(() => loadLocal(LS_CART_KEY));
  const [wishlist, setWishlist] = useState(() => loadLocal(LS_WISHLIST_KEY));
  const [addresses, setAddresses] = useState([]);
  const [profile, setProfileState] = useState({ phone: "", instagram: "" });

  const hasMerged = useRef(false);
  const saveTimer = useRef(null);
  const cartRef = useRef(cart);
  const wishlistRef = useRef(wishlist);
  useEffect(() => {
    cartRef.current = cart;
    wishlistRef.current = wishlist;
  }, [cart, wishlist]);

  // Always mirror to localStorage - this is both the guest fallback and
  // the fast local cache for signed-in customers.
  useEffect(() => { saveLocal(LS_CART_KEY, cart); }, [cart]);
  useEffect(() => { saveLocal(LS_WISHLIST_KEY, wishlist); }, [wishlist]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setDisplayName(u?.displayName || "");
      setAuthChecked(true);

      if (u && !hasMerged.current) {
        hasMerged.current = true;
        try {
          const ref = doc(db, "users", u.uid);
          const snap = await getDoc(ref);
          const cloud = snap.exists() ? snap.data() : {};
          const sameOwner = readOwner() === u.uid;
          const mergedCart = mergeCarts(cartRef.current, cloud.cart || [], sameOwner);
          const mergedWishlist = mergeWishlists(wishlistRef.current, cloud.wishlist || []);
          setCart(mergedCart);
          setWishlist(mergedWishlist);
          const legacy = legacyToAddress(cloud.address);
          setAddresses(cloud.addresses || (legacy ? [legacy] : []));
          setProfileState({ phone: "", instagram: "", ...(cloud.profile || {}) });
          writeOwner(u.uid);
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
      }
    });
    return unsub;
  }, []);

  // Push changes to Firestore for signed-in customers, debounced so
  // rapid qty +/- clicks don't each fire their own write.
  useEffect(() => {
    if (!user) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setDoc(doc(db, "users", user.uid), { cart, wishlist, updatedAt: Date.now() }, { merge: true }).catch(() => {});
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [cart, wishlist, user]);

  const persist = (fields) => {
    if (user) setDoc(doc(db, "users", user.uid), { ...fields, updatedAt: Date.now() }, { merge: true }).catch(() => {});
  };

  const saveAddresses = (list) => {
    const next = withSingleDefault(list);
    setAddresses(next);
    persist({ addresses: next });
  };

  const saveProfile = (next) => {
    setProfileState(next);
    persist({ profile: next });
  };

  const address = useMemo(() => checkoutPrefill(addresses, profile, user), [addresses, profile, user]);

  const setAddress = (form) => {
    if (!user || addresses.length > 0 || !form?.address) return;
    saveAddresses([
      {
        id: newAddressId(),
        fullName: form.name || "",
        phone: normalizePhone(form.phone),
        line1: form.address,
        line2: "",
        landmark: "",
        city: form.city || "",
        state: form.state || "",
        pincode: form.pincode || "",
        country: "India",
        isDefault: true,
      },
    ]);
    if (form.instagram && !profile.instagram) saveProfile({ ...profile, instagram: form.instagram });
  };

  const logOut = async () => {
    try {
      await setDoc(doc(db, "users", user.uid), { cart: cartRef.current, wishlist: wishlistRef.current, updatedAt: Date.now() }, { merge: true });
    } catch {
      // offline: the last debounced save is what stays in the account
    }
    writeOwner(null);
    setCart([]);
    setWishlist([]);
    setAddresses([]);
    setProfileState({ phone: "", instagram: "" });
    signOut(auth);
  };

  return {
    cart, setCart,
    wishlist, setWishlist,
    address, setAddress,
    addresses, saveAddresses,
    profile, saveProfile,
    user, authChecked,
    displayName, setDisplayName,
    logOut,
  };
}

const ERROR_MESSAGES = {
  "auth/email-already-in-use": "That email already has an account. Try logging in instead.",
  "auth/invalid-email": "That doesn't look like a valid email.",
  "auth/weak-password": "Password should be at least 6 characters.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "No account found with that email.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/popup-closed-by-user": "Sign-in was closed before finishing.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "No connection. Check your internet and try again.",
  "auth/unauthorized-domain": "Sign-in isn't enabled for this website address yet.",
};

export function AccountIcon({ user, onOpenAuth, onOpenAccount }) {
  return (
    <button type="button" className="sb-iconbtn" onClick={() => (user ? onOpenAccount() : onOpenAuth())} aria-label={user ? "Your account" : "Log in or sign up"}>
      <User size={20} aria-hidden="true" />
      {user && <span className="sb-iconbtn__dot" aria-hidden="true" />}
    </button>
  );
}

const TITLES = { login: "Welcome back", signup: "Create an account", reset: "Reset password" };
const SUBTITLES = {
  login: "Log in to pick up your cart and wishlist.",
  signup: "Save your cart, wishlist and delivery details across devices.",
  reset: "We'll email you a link to set a new password.",
};

export function AuthForm({ onDone }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const switchMode = (next) => {
    setError("");
    setInfo("");
    setMode(next);
  };

  const run = async (task, fallback) => {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await task();
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || fallback);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (mode === "reset") {
      return run(async () => {
        await sendPasswordResetEmail(auth, email);
        setInfo("Check your email for a reset link. It may take a minute, and check spam too.");
      }, "Couldn't send that. Check the email address.");
    }
    return run(async () => {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onDone();
    }, "Something went wrong. Please try again.");
  };

  const google = () =>
    run(async () => {
      await signInWithPopup(auth, googleProvider);
      onDone();
    }, "Google sign-in didn't go through. Please try again.");

  return (
    <div className="sb-authcard">
      <h2 className="sb-authcard__title">{TITLES[mode]}</h2>
      <p className="sb-auth__sub">{SUBTITLES[mode]}</p>

      {mode !== "reset" && (
        <>
          <Button variant="secondary" block onClick={google} disabled={busy}>
            Continue with Google
          </Button>
          <div className="sb-auth__or" aria-hidden="true"><span>or</span></div>
        </>
      )}

      <form className="sb-auth__form" onSubmit={submit}>
        {mode === "signup" && (
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        )}
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        {mode !== "reset" && (
          <>
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              hint={mode === "signup" ? "At least 6 characters" : undefined}
            />
            <label className="sb-auth__show">
              <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
              Show password
            </label>
          </>
        )}

        {error && <Alert tone="error">{error}</Alert>}
        {info && <Alert tone="success">{info}</Alert>}

        <Button type="submit" block loading={busy}>
          {mode === "signup" ? "Sign up" : mode === "reset" ? "Send reset link" : "Log in"}
        </Button>
      </form>

      <div className="sb-auth__links">
        {mode === "login" && (
          <>
            <button type="button" className="sb-linkbtn" onClick={() => switchMode("reset")}>Forgot password?</button>
            <p>New here? <button type="button" className="sb-linkbtn sb-linkbtn--strong" onClick={() => switchMode("signup")}>Sign up</button></p>
          </>
        )}
        {mode === "signup" && (
          <p>Already have an account? <button type="button" className="sb-linkbtn sb-linkbtn--strong" onClick={() => switchMode("login")}>Log in</button></p>
        )}
        {mode === "reset" && (
          <button type="button" className="sb-linkbtn" onClick={() => switchMode("login")}>Back to login</button>
        )}
      </div>
    </div>
  );
}

