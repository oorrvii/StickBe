import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { FIREBASE_PROJECT_ID } from "./config.js";

function app() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
  const key = JSON.parse(raw);
  if (key.project_id !== FIREBASE_PROJECT_ID) {
    throw new Error(`Service account belongs to "${key.project_id}", expected "${FIREBASE_PROJECT_ID}"`);
  }
  return initializeApp({ credential: cert(key), projectId: FIREBASE_PROJECT_ID });
}

export const getDb = () => getFirestore(app());
export const verifyToken = (token) => getAuth(app()).verifyIdToken(token);
