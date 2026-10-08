import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA6NjcMwl4ng5tXGyUP2FxvD7D1Fn1_Kis",
  authDomain: "stickbe-backend.firebaseapp.com",
  projectId: "stickbe-backend",
  storageBucket: "stickbe-backend.firebasestorage.app",
  messagingSenderId: "846801696747",
  appId: "1:846801696747:web:4fecbd8e592df3a8ce4bae"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();