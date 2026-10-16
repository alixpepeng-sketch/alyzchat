import { auth } from "./firebase.js";
import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let verifier = null, confirmation = null;

export function initRecaptcha() {
  if (!verifier) verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
  return verifier;
}
function resetRecaptcha() {
  try { verifier && verifier.clear(); } catch (e) {}
  verifier = null;
  document.getElementById("recaptcha-container").innerHTML = "";
}
export async function sendOtp(localNumber) {
  try {
    confirmation = await signInWithPhoneNumber(auth, "+62" + localNumber, initRecaptcha());
  } catch (e) { resetRecaptcha(); throw e; }
}
export async function verifyOtp(code) {
  if (!confirmation) throw new Error("Kirim OTP terlebih dahulu.");
  return (await confirmation.confirm(code)).user;
}
export async function logout() {
  try { await signOut(auth); } catch (e) {}
  resetRecaptcha();
}
export const authReady = () => auth.authStateReady();
