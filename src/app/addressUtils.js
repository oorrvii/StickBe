export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export function newAddressId() {
  return `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

export function withSingleDefault(list) {
  if (list.length === 0) return list;
  const defaultId = (list.find((a) => a.isDefault) || list[0]).id;
  return list.map((a) => ({ ...a, isDefault: a.id === defaultId }));
}

export function legacyToAddress(legacy) {
  if (!legacy || !legacy.address) return null;
  return {
    id: newAddressId(),
    fullName: legacy.name || "",
    phone: normalizePhone(legacy.phone),
    line1: legacy.address,
    line2: "",
    landmark: "",
    city: legacy.city || "",
    state: legacy.state || "",
    pincode: legacy.pincode || "",
    country: "India",
    isDefault: true,
  };
}

export function checkoutPrefill(addresses, profile, user) {
  const d = addresses.find((a) => a.isDefault) || addresses[0];
  if (!d && !profile.phone && !profile.instagram) return null;
  return {
    name: d?.fullName || user?.displayName || "",
    phone: d?.phone || profile.phone || "",
    instagram: profile.instagram || "",
    address: d ? [d.line1, d.line2, d.landmark].filter(Boolean).join(", ") : "",
    city: d?.city || "",
    state: d?.state || "",
    pincode: d?.pincode || "",
    email: user?.email || "",
  };
}

export function formatAddress(a) {
  return [a.line1, a.line2, a.landmark, `${a.city}, ${a.state} ${a.pincode}`].filter(Boolean).join(", ");
}
