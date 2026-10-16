import { randomBytes } from "node:crypto";

// ENV FIREBASE_API_KEY tidak pernah ditulis mentah ke browser:
// dikirim sebagai hex yang di-XOR dengan kunci acak per request, dipecah & dibalik.
export default (req, res) => {
  const dest = req.headers["sec-fetch-dest"];
  const ref = req.headers["referer"] || "";
  if ((dest && dest !== "script") || (ref && !ref.includes(req.headers.host))) {
    res.status(403).send("/* forbidden */");
    return;
  }
  const b64 = process.env.FIREBASE_API_KEY || "";
  const key = randomBytes(8);
  const hex = Buffer.from(b64, "latin1").map((b, i) => b ^ key[i % key.length]).toString("hex");
  const n = Math.ceil(hex.length / 3 / 2) * 2 || 2;
  const parts = [hex.slice(0, n), hex.slice(n, n * 2), hex.slice(n * 2)].reverse();
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-store");
  res.send(`window.__e=${JSON.stringify({ k: key.toString("hex"), d: parts })};`);
};
