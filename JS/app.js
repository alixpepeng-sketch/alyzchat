import { sendOtp, verifyOtp, logout, authReady } from "./auth.js";
import { getContacts, addContact, removeContact, getBlocked, toggleBlock, sendMessage, listenMessages, clearChat, deleteMessage } from "./chat.js";

const $ = id => document.getElementById(id);
const LS = localStorage;
let phone = LS.getItem("alyz_phone");
let current = null, unsub = null, blockedNow = false;
const setMsg = (el, t) => { $(el).textContent = t; };

/* ---------- Splash ---------- */
function runSplash(withSub, showNext) {
  const sp = $("splash");
  sp.style.transition = "none"; sp.classList.remove("hide"); void sp.offsetWidth; sp.style.transition = "";
  $("splashSub").hidden = !withSub;
  return new Promise(res => {
    const dur = 2400, t0 = performance.now();
    (function tick(t) {
      const p = Math.max(0, Math.min(100, Math.round(((t - t0) / dur) * 100)));
      $("barFill").style.width = p + "%"; $("pct").textContent = p + "%";
      if (p < 100) return requestAnimationFrame(tick);
      setTimeout(() => { showNext(); sp.classList.add("hide"); res(); }, 250);
    })(t0);
  });
}

/* ---------- Screens ---------- */
function showLogin() { $("login").hidden = false; $("home").hidden = true; }
function showHome() {
  $("login").hidden = true; $("home").hidden = false;
  $("myPhone").textContent = "+" + phone;
  $("phoneShow").value = "+" + phone;
  $("nameInput").value = LS.getItem("alyz_name_" + phone) || "";
  renderAvatar(); renderContacts(); switchTab("chat");
}

/* ---------- Login ---------- */
$("phoneInput").addEventListener("input", e => {
  const d = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 12);
  e.target.value = [d.slice(0, 3), d.slice(3, 7), d.slice(7)].filter(Boolean).join("-");
});
$("sendBtn").onclick = async () => {
  const d = $("phoneInput").value.replace(/\D/g, "");
  if (!/^8\d{8,11}$/.test(d)) return setMsg("loginMsg", "Nomor tidak valid. Contoh: 812-3456-7890");
  $("sendBtn").disabled = true; setMsg("loginMsg", "Mengirim OTP...");
  try { await sendOtp(d); $("otpBox").hidden = false; setMsg("loginMsg", "OTP terkirim. Masukkan kode."); }
  catch (e) { setMsg("loginMsg", "Gagal kirim OTP: " + (e.code || e.message)); }
  $("sendBtn").disabled = false;
};
$("verifyBtn").onclick = async () => {
  const code = $("otpInput").value.trim();
  if (code.length < 6) return setMsg("loginMsg", "Masukkan 6 digit kode OTP.");
  $("verifyBtn").disabled = true; setMsg("loginMsg", "Memverifikasi...");
  try {
    await verifyOtp(code);
    phone = "62" + $("phoneInput").value.replace(/\D/g, "");
    LS.setItem("alyz_phone", phone);
    await runSplash(true, showHome);
  } catch (e) { setMsg("loginMsg", "Kode salah / kedaluwarsa: " + (e.code || e.message)); }
  $("verifyBtn").disabled = false;
};

/* ---------- Contacts ---------- */
const userName = c => "User" + c.n;
function renderContacts() {
  const list = getContacts(phone), box = $("contactList");
  box.innerHTML = ""; $("emptyText").hidden = list.length > 0;
  list.forEach(c => {
    const b = document.createElement("button"); b.className = "contact";
    b.innerHTML = '<div class="avatar"></div><div class="c-info"><b></b><span></span></div>';
    b.querySelector(".avatar").textContent = c.phone.slice(-2);
    b.querySelector("b").textContent = userName(c);
    b.querySelector("span").textContent = "+" + c.phone;
    b.onclick = () => openChat(c);
    box.appendChild(b);
  });
}
$("addBtn").onclick = () => { $("contactInput").value = ""; setMsg("modalMsg", ""); $("modal").hidden = false; $("contactInput").focus(); };
$("modalCancel").onclick = () => { $("modal").hidden = true; };
$("modalSave").onclick = () => {
  try { addContact(phone, $("contactInput").value); $("modal").hidden = true; renderContacts(); }
  catch (e) { setMsg("modalMsg", e.message); }
};

/* ---------- Chat ---------- */
function openChat(c) {
  current = c; blockedNow = getBlocked(phone).includes(c.phone);
  $("chatAvatar").textContent = c.phone.slice(-2);
  $("chatName").textContent = userName(c); $("chatNum").textContent = "+" + c.phone;
  $("msgs").innerHTML = ""; $("menu").hidden = true; updateBlockUI();
  $("chat").classList.add("open"); fitViewport();
  unsub && unsub();
  unsub = listenMessages(phone, c.phone, renderMessages, e => {
    $("msgs").innerHTML = ""; const p = document.createElement("p"); p.className = "empty";
    p.textContent = e.code === "failed-precondition" ? "BUAT INDEX FIRESTORE (LIHAT CONSOLE)" : "GAGAL MEMUAT CHAT";
    $("msgs").appendChild(p); console.error(e);
  });
}
function closeChat() { $("chat").classList.remove("open"); unsub && unsub(); unsub = null; current = null; $("menu").hidden = true; }
function updateBlockUI() {
  $("mBlock").textContent = blockedNow ? "Buka Blokir" : "Blokir Kontak";
  $("msgInput").disabled = blockedNow; $("msgInput").placeholder = blockedNow ? "Kontak diblokir" : "Ketik pesan";
}
function renderMessages(msgs) {
  const box = $("msgs");
  box.innerHTML = "";
  msgs.filter(m => !(blockedNow && m.sender !== phone)).forEach(m => {
    const d = document.createElement("div");
    d.className = "b " + (m.sender === phone ? "me" : "other"); d.textContent = m.text;
    const del = () => { if (confirm("Hapus pesan ini?")) deleteMessage(m.id).catch(() => alert("Gagal menghapus.")); };
    let timer; d.oncontextmenu = e => { e.preventDefault(); del(); };
    d.ontouchstart = () => { timer = setTimeout(del, 600); };
    ["ontouchend", "ontouchmove", "ontouchcancel"].forEach(ev => d[ev] = () => clearTimeout(timer));
    box.appendChild(d);
  });
  box.scrollTop = box.scrollHeight;
}
async function doSend() {
  const t = $("msgInput").value; if (!t.trim() || !current || blockedNow) return;
  $("msgInput").value = ""; autoGrow();
  try { await sendMessage(phone, current.phone, t); } catch (e) { alert("Gagal kirim pesan."); }
  $("msgInput").focus();
}
function autoGrow() { const t = $("msgInput"); t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 130) + "px"; }
$("msgInput").addEventListener("input", autoGrow);
$("msgInput").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer:fine)").matches) { e.preventDefault(); doSend(); }
});
$("sendMsg").onmousedown = e => e.preventDefault();
$("sendMsg").onclick = doSend;
$("backBtn").onclick = closeChat;
$("dotsBtn").onclick = e => { e.stopPropagation(); $("menu").hidden = !$("menu").hidden; };
document.addEventListener("click", () => { $("menu").hidden = true; });
$("mBlock").onclick = () => { const c = current; toggleBlock(phone, c.phone); openChat(c); };
$("mClear").onclick = async () => { if (confirm("Hapus semua chat dengan kontak ini?")) { try { await clearChat(phone, current.phone); } catch (e) { alert("Gagal menghapus chat."); } } };
$("mDel").onclick = () => { if (confirm("Hapus kontak ini?")) { removeContact(phone, current.phone); closeChat(); renderContacts(); } };

/* Keyboard: samakan tinggi chat dengan visual viewport */
function fitViewport() {
  const vv = window.visualViewport, ch = $("chat");
  if (!vv) return;
  ch.style.height = vv.height + "px"; ch.style.top = vv.offsetTop + "px";
  const m = $("msgs"); m.scrollTop = m.scrollHeight;
}
if (window.visualViewport) { visualViewport.addEventListener("resize", fitViewport); visualViewport.addEventListener("scroll", fitViewport); }

/* ---------- Tabs & Profile ---------- */
function switchTab(t) {
  const chat = t === "chat";
  $("tabChat").hidden = !chat; $("tabProfile").hidden = chat;
  $("navChat").classList.toggle("active", chat); $("navProfile").classList.toggle("active", !chat);
  $("addBtn").style.visibility = chat ? "visible" : "hidden";
}
$("navChat").onclick = () => switchTab("chat");
$("navProfile").onclick = () => switchTab("profile");

function renderAvatar() {
  const img = LS.getItem("alyz_img_" + phone), a = $("avatarBtn");
  a.innerHTML = "";
  if (img) { const i = document.createElement("img"); i.src = img; a.appendChild(i); }
  else a.textContent = (LS.getItem("alyz_name_" + phone) || phone.slice(-2)).slice(0, 2).toUpperCase();
}
$("avatarBtn").onclick = () => $("fileInput").click();
$("fileInput").onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const s = Math.min(im.width, im.height), c = document.createElement("canvas"); c.width = c.height = 400;
      c.getContext("2d").drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 400, 400);
      try { LS.setItem("alyz_img_" + phone, c.toDataURL("image/jpeg", 0.85)); renderAvatar(); setMsg("profMsg", "Foto diganti."); }
      catch (err) { setMsg("profMsg", "Penyimpanan penuh."); }
    };
    im.src = fr.result;
  };
  fr.readAsDataURL(f); e.target.value = "";
};
$("saveBtn").onclick = () => { LS.setItem("alyz_name_" + phone, $("nameInput").value.trim()); renderAvatar(); setMsg("profMsg", "Profile tersimpan."); };
$("logoutBtn").onclick = async () => { await logout(); LS.removeItem("alyz_phone"); location.reload(); };

/* ---------- Boot ---------- */
(async () => {
  if (phone) { try { await Promise.race([authReady(), new Promise(r => setTimeout(r, 3000))]); } catch (e) {} }
  runSplash(false, () => (phone ? showHome() : showLogin()));
})();
