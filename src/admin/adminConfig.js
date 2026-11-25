// The shop owner's login. The Firestore rules use the same address, so changing
// it here alone does not give anyone access.
export const ADMIN_EMAIL = "stickbe.co@gmail.com";

export function isAdminUser(user) {
  return !!user && typeof user.email === "string" && user.email.toLowerCase() === ADMIN_EMAIL;
}
