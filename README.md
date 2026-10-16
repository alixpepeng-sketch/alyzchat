# Alyz Project Tools

Web chat neubrutalism monochrome. Firebase Phone OTP + Firestore realtime. Static, tanpa build step.

## Struktur
```
index.html   css/style.css   api/env.js   vercel.json   package.json
js/firebase.js  js/auth.js  js/chat.js  js/app.js
.env.example  README.md
```

## 1. Siapkan Firebase
1. Buat project di https://console.firebase.google.com, tambah Web App, salin `firebaseConfig`.
2. Authentication > Sign-in method > aktifkan **Phone**.
3. Authentication > Settings > Authorized domains > tambahkan domain Vercel Anda (`xxx.vercel.app`).
4. Firestore Database > buat database, lalu pasang rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /messages/{id} {
      allow create: if request.auth != null && request.resource.data.sender == request.auth.token.phone_number.replace('\\+','');
      allow read, delete: if request.auth != null && (resource.data.sender == request.auth.token.phone_number.replace('\\+','') || resource.data.receiver == request.auth.token.phone_number.replace('\\+',''));
    }
  }
}
```
5. Query chat memakai `where(chatId) + orderBy(ts)`: saat pertama dibuka, console browser menampilkan link untuk membuat **composite index** (chatId asc, ts asc). Klik link itu, tunggu aktif.

## 2. Buat nilai base64 ENV
Isi `FIREBASE_API_KEY` = base64 dari JSON config (bukan teks mentah). Di console browser (F12):
```js
btoa(JSON.stringify({
  apiKey: "...", authDomain: "...", projectId: "...",
  storageBucket: "...", messagingSenderId: "...", appId: "..."
}))
```
Atau di terminal: `echo -n '{"apiKey":"..."}' | base64 -w0`

Catatan: `/api/env.js` tidak menulis base64 mentah; nilainya di-XOR dengan kunci acak per request lalu didecode di `js/firebase.js`. Ini hanya menyulitkan intip biasa, bukan proteksi sungguhan: config web Firebase memang harus sampai ke browser. Amankan dengan Firestore Rules, Authorized domains, dan batasi API key (HTTP referrer) di Google Cloud Console > Credentials. Base64 hanya encoding, bukan enkripsi. Keamanan sebenarnya ada di Firestore Rules dan Authorized domains.

## 3. Deploy ke Vercel
1. Upload folder ini ke GitHub, atau jalankan `npx vercel` dari folder ini.
2. Project Settings > Environment Variables > tambah `FIREBASE_API_KEY` = hasil base64 (semua environment).
3. Deploy / Redeploy. `/api/env.js` akan menyuntikkan `window.__FIREBASE_B64__`.

## Tes lokal tanpa Vercel
Jalankan server statis (`npx serve .`), lalu di console browser:
`localStorage.setItem("FIREBASE_API_KEY_B64", "<base64>")` dan refresh (fallback `js/firebase.js`).
Untuk nomor uji tanpa SMS, daftarkan di Authentication > Phone > Phone numbers for testing.

## Penyimpanan (localStorage, persisten)
`alyz_phone`, `alyz_contacts_<phone>`, `alyz_name_<phone>`, `alyz_img_<phone>`, `alyz_session_idx`, `alyz_blocked_<phone>`.
Sesi hilang hanya saat LOG OUT atau data Chrome dihapus.

## Firebase Rules & Index (folder `firebase/`)
- `firestore.rules`  : rules yang cocok dengan kode saat ini.
- `firestore.indexes.json` : composite index (chatId, ts).
- `firestore.private.rules` + `firestore.private.indexes.json` : varian chat privat per peserta. Pakai hanya jika `js/chat.js` ditambah field `participants: [me, other]` pada sendMessage dan filter `where("participants","array-contains",me)` pada listenMessages dan clearChat.

Deploy via Firebase CLI:
```
npm i -g firebase-tools
firebase login
cd firebase
firebase use --add        # pilih project Anda
firebase deploy --only firestore
```
Atau salin isi `firestore.rules` manual ke Console > Firestore > Rules > Publish. Uji dulu di Rules Playground.
