/* ===== M3AK Cloud — optional accounts + sync (Firebase) =====
   Syncs ONLY tasks / goals / habits + profile counts.
   Chats (ask / vent / solve) NEVER leave the device — by design. */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyClpZvM3bHhrzsuL35uydDcrTPw8Nz88VY",
  authDomain: "m3ak-ai.firebaseapp.com",
  projectId: "m3ak-ai",
  storageBucket: "m3ak-ai.firebasestorage.app",
  messagingSenderId: "595033477051",
  appId: "1:595033477051:web:2f1788626be26659d8be9e"
};
const OWNER_EMAIL = "hamzaazemat105@gmail.com";
let cloudUser = null, cloudDb = null, syncTimer = null;

function acctMsg(text, ok) {
  const el = document.getElementById("acctMsg");
  if (el) { el.textContent = text || ""; el.style.color = ok ? "var(--green)" : "var(--danger)"; }
}
function setSyncNote(state) {
  const el = document.getElementById("syncNote");
  if (!el) return;
  const fr = settings.lang === "fr";
  el.textContent = state === "synced" ? (fr ? "Synchronisé ☁️✅" : "المزامنة تمت ☁️✅")
    : state === "error" ? (fr ? "Échec de synchro — réessaie." : "فشلت المزامنة — عاود المحاولة.")
    : (fr ? "Synchronisation activée ☁️" : "المزامنة مفعّلة ☁️");
}
function renderAccount() {
  const out = document.getElementById("acctSignedOut");
  const inn = document.getElementById("acctSignedIn");
  if (!out || !inn) return;
  if (cloudUser) {
    out.hidden = true; inn.hidden = false;
    const em = document.getElementById("acctUserEmail");
    if (em) em.textContent = cloudUser.email || "";
    setSyncNote("on");
  } else {
    out.hidden = false; inn.hidden = true;
  }
}
function profilePayload(withCreated) {
  const p = {
    email: cloudUser.email || "",
    name: settings.name || "",
    plan: "free",
    counts: { tasks: data.tasks.length, goals: data.goals.length, habits: data.habits.length },
    data: { tasks: data.tasks, goals: data.goals, habits: data.habits },
    updatedAt: Date.now(),
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (withCreated) p.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  return p;
}
async function pushCloud(withCreated) {
  if (!cloudUser || !cloudDb) return;
  try {
    await cloudDb.collection("users").doc(cloudUser.uid).set(profilePayload(withCreated), { merge: true });
    setSyncNote("synced");
  } catch (e) { setSyncNote("error"); }
}
function queueSync() {
  if (!cloudUser) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => pushCloud(false), 1500);
}
window.__queueSync = queueSync;

async function syncOnSignIn() {
  if (!cloudUser || !cloudDb) return;
  try {
    const snap = await cloudDb.collection("users").doc(cloudUser.uid).get();
    if (!snap.exists) { await pushCloud(true); return; }
    const d = snap.data() || {};
    const localEmpty = !data.tasks.length && !data.goals.length && !data.habits.length;
    if (localEmpty && d.data && (d.data.tasks || d.data.goals || d.data.habits)) {
      data.tasks = d.data.tasks || []; data.goals = d.data.goals || []; data.habits = d.data.habits || [];
      persistData();
      renderHome(); renderTasks(); renderProgress();
      toast(settings.lang === "fr" ? "Données restaurées ☁️" : "ترجعات بياناتك من السحابة ☁️");
    }
    await pushCloud(false);
  } catch (e) { setSyncNote("error"); }
}
function authError(e) {
  const fr = settings.lang === "fr";
  const code = (e && e.code) || "";
  if (code.includes("email-already-in-use")) return fr ? "Cet e-mail est déjà inscrit — connecte-toi." : "هاد الإيميل مسجل من قبل — جرب تسجيل الدخول.";
  if (code.includes("weak-password")) return fr ? "Mot de passe trop court (6 caractères min)." : "كلمة السر قصيرة — خاصها 6 حروف على الأقل.";
  if (code.includes("invalid-email")) return fr ? "E-mail invalide." : "الإيميل ما صحيحش.";
  if (code.includes("network")) return fr ? "Pas de connexion internet." : "ما كايناش إنترنت — تحقق من الاتصال.";
  if (code.includes("popup")) return fr ? "La fenêtre Google a été fermée." : "تسدّات نافذة Google — عاود المحاولة.";
  return fr ? "E-mail ou mot de passe incorrect." : "الإيميل ولا كلمة السر غلاطة — عاود المحاولة.";
}
(function initCloud() {
  const card = document.getElementById("accountCard");
  try {
    if (!window.firebase || !FIREBASE_CONFIG.apiKey) { if (card) card.hidden = true; return; }
    firebase.initializeApp(FIREBASE_CONFIG);
    cloudDb = firebase.firestore();
    firebase.auth().onAuthStateChanged((u) => {
      cloudUser = u || null;
      renderAccount();
      if (u) syncOnSignIn();
    });
  } catch (e) { if (card) card.hidden = true; return; }

  const email = () => (document.getElementById("acctEmail").value || "").trim();
  const pass = () => document.getElementById("acctPass").value || "";
  document.getElementById("acctSignUp").addEventListener("click", async () => {
    acctMsg("");
    try { await firebase.auth().createUserWithEmailAndPassword(email(), pass()); toast(settings.lang === "fr" ? "Compte créé 🎉" : "تنشأ الحساب 🎉"); }
    catch (e) { acctMsg(authError(e)); }
  });
  document.getElementById("acctSignIn").addEventListener("click", async () => {
    acctMsg("");
    try { await firebase.auth().signInWithEmailAndPassword(email(), pass()); toast(settings.lang === "fr" ? "Bienvenue 👋" : "مرحبا بيك 👋"); }
    catch (e) { acctMsg(authError(e)); }
  });
  document.getElementById("acctGoogle").addEventListener("click", async () => {
    acctMsg("");
    try { await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
    catch (e) { acctMsg(authError(e)); }
  });
  document.getElementById("acctSyncNow").addEventListener("click", () => pushCloud(false));
  document.getElementById("acctSignOut").addEventListener("click", async () => { await firebase.auth().signOut(); });
})();
