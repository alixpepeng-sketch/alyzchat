import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function readEnv() {
  const e = window.__e;
  if (!e) return "";
  delete window.__e; // hapus dari global setelah dibaca
  const k = e.k.match(/../g).map(h => parseInt(h, 16));
  const hex = e.d.slice().reverse().join("");
  return (hex.match(/../g) || []).map((h, i) => String.fromCharCode(parseInt(h, 16) ^ k[i % k.length])).join("");
}

let b64 = readEnv() || window.__FIREBASE_B64__ || localStorage.getItem("FIREBASE_API_KEY_B64");
if (!b64) throw new Error("ENV FIREBASE_API_KEY belum diset (base64 dari JSON firebaseConfig).");

const config = JSON.parse(atob(b64));
export const app = initializeApp(config);
export const auth = getAuth(app);
auth.languageCode = "id";
export const db = getFirestore(app);
