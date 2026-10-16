import { db } from "./firebase.js";
import {
  collection, addDoc, deleteDoc, doc, query, where, orderBy, onSnapshot, getDocs, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CK = p => "alyz_contacts_" + p;
const BK = p => "alyz_blocked_" + p;
const read = k => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };

export const getContacts = p => read(CK(p));
const saveContacts = (p, list) => localStorage.setItem(CK(p), JSON.stringify(list));

export function addContact(me, num) {
  num = (num || "").replace(/\D/g, "");
  if (!num.startsWith("62")) throw new Error("Nomor harus diawali 62.");
  if (num.length < 10 || num.length > 15) throw new Error("Panjang nomor tidak valid.");
  if (num === me) throw new Error("Tidak bisa menambah nomor sendiri.");
  const list = getContacts(me);
  if (list.some(c => c.phone === num)) throw new Error("Kontak sudah ada.");
  const idx = (parseInt(localStorage.getItem("alyz_session_idx") || "0", 10) || 0) + 1;
  localStorage.setItem("alyz_session_idx", String(idx));
  list.push({ phone: num, n: idx });
  saveContacts(me, list);
}
export const removeContact = (me, num) => saveContacts(me, getContacts(me).filter(c => c.phone !== num));

export const getBlocked = me => read(BK(me));
export function toggleBlock(me, num) {
  let b = getBlocked(me);
  const was = b.includes(num);
  b = was ? b.filter(x => x !== num) : [...b, num];
  localStorage.setItem(BK(me), JSON.stringify(b));
  return !was;
}

export const chatId = (a, b) => [a, b].sort().join("_");

export async function sendMessage(me, other, text) {
  text = text.trim();
  if (!text) return;
  await addDoc(collection(db, "messages"), {
    chatId: chatId(me, other), sender: me, receiver: other, text, ts: serverTimestamp()
  });
}
export function listenMessages(me, other, cb, onErr) {
  const q = query(collection(db, "messages"), where("chatId", "==", chatId(me, other)), orderBy("ts", "asc"));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onErr);
}
export async function clearChat(me, other) {
  const snap = await getDocs(query(collection(db, "messages"), where("chatId", "==", chatId(me, other))));
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}
export const deleteMessage = id => deleteDoc(doc(db, "messages", id));
