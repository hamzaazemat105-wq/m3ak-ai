/* ===== Radar Cloud — optional accounts + sync (Firebase) =====
   Syncs ONLY the user's tracking data: tracked concours, document
   checklists and the eligibility profile. Nothing else leaves the
   device. */
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
  el.textContent = state === "synced" ? window.t("syncSynced")
    : state === "error" ? window.t("syncError")
    : window.t("syncOn");
}
function renderAccount() {
  const out = document.getElementById("acctSignedOut");
  const inn = document.getElementById("acctSignedIn");
  if (!out || !inn) return;
  const st = document.getElementById("settingsAcctState");
  if (cloudUser) {
    out.hidden = true; inn.hidden = false;
    const em = document.getElementById("acctUserEmail");
    if (em) em.textContent = cloudUser.email || "";
    setSyncNote("on");
    if (window.__hideGate) window.__hideGate();
    try { localStorage.setItem("radar.gate.v1", "user"); } catch {}
    if (st) st.textContent = window.t("settingsSignedIn") + (cloudUser.email || "");
  } else {
    out.hidden = false; inn.hidden = true;
    if (st) st.textContent = window.t("settingsSignedOut");
  }
}
function profilePayload(withCreated) {
  const p = {
    email: cloudUser.email || "",
    name: "",
    plan: "free",
    app: "radar",
    trackedCount: (data.tracked || []).length,
    counts: { tracked: (data.tracked || []).length },
    data: { tracked: data.tracked, checks: data.checks, profile: data.profile },
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
    const localEmpty = !(data.tracked || []).length && !Object.keys(data.checks || {}).length;
    if (localEmpty && d.data && (d.data.tracked || d.data.checks || d.data.profile)) {
      data.tracked = d.data.tracked || [];
      data.checks = d.data.checks || {};
      data.profile = Object.assign({ age: "", rank: "", sector: "" }, d.data.profile || {});
      persistData();
      const a = document.getElementById("chkAge"), dp = document.getElementById("chkDiploma");
      if (a && data.profile.age) a.value = data.profile.age;
      if (dp && data.profile.rank) dp.value = data.profile.rank;
      renderHome(); renderMine();
      toast(window.t("cloudRestored"));
    }
    await pushCloud(false);
  } catch (e) { setSyncNote("error"); }
}
function authError(e) {
  const code = (e && e.code) || "";
  if (code.includes("email-already-in-use")) return window.t("errInUse");
  if (code.includes("weak-password")) return window.t("errWeak");
  if (code.includes("invalid-email")) return window.t("errEmail");
  if (code.includes("network")) return window.t("errNetwork");
  if (code.includes("popup")) return window.t("errPopup");
  return window.t("errGeneric");
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
      const ab2 = document.getElementById("openGateBtn");
      if (ab2) ab2.textContent = u ? window.t("switchAccount") : window.t("signInUp");
      if (u) syncOnSignIn();
    });
  } catch (e) { if (card) card.hidden = true; return; }

  const email = () => (document.getElementById("acctEmail").value || "").trim();
  const pass = () => document.getElementById("acctPass").value || "";
  let authMode = "in";
  const setMode = (m) => {
    authMode = m;
    document.getElementById("tabSignIn").classList.toggle("on", m === "in");
    document.getElementById("tabSignUp").classList.toggle("on", m === "up");
    document.getElementById("pass2Wrap").hidden = m !== "up";
    document.getElementById("acctMainBtn").textContent = m === "in" ? window.t("tabIn") : window.t("tabUp");
    document.getElementById("acctPass").setAttribute("autocomplete", m === "in" ? "current-password" : "new-password");
    acctMsg("");
  };
  document.getElementById("tabSignIn").addEventListener("click", () => setMode("in"));
  document.getElementById("tabSignUp").addEventListener("click", () => setMode("up"));
  document.querySelectorAll(".eye").forEach((b) => b.addEventListener("click", () => {
    const inp = document.getElementById(b.dataset.eye);
    if (!inp) return;
    const show = inp.type === "password";
    inp.type = show ? "text" : "password";
    b.textContent = show ? "🙈" : "👁️";
    inp.focus();
  }));
  document.getElementById("acctMainBtn").addEventListener("click", async () => {
    acctMsg("");
    const em = email(), pw = pass();
    if (!em || !em.includes("@")) { acctMsg(window.t("errBadEmail")); return; }
    if (authMode === "up") {
      const pw2 = document.getElementById("acctPass2").value || "";
      if (pw.length < 6) { acctMsg(window.t("errShortPass")); return; }
      if (pw !== pw2) { acctMsg(window.t("errMismatch")); return; }
      try { await firebase.auth().createUserWithEmailAndPassword(em, pw); toast(window.t("toastCreated")); }
      catch (e) { acctMsg(authError(e)); }
    } else {
      if (!pw) { acctMsg(window.t("errNoPass")); return; }
      try { await firebase.auth().signInWithEmailAndPassword(em, pw); toast(window.t("toastWelcome")); }
      catch (e) { acctMsg(authError(e)); }
    }
  });
  document.getElementById("acctGoogle").addEventListener("click", async () => {
    acctMsg("");
    try { await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
    catch (e) { acctMsg(authError(e)); }
  });
  document.getElementById("acctSyncNow").addEventListener("click", () => pushCloud(false));
  document.getElementById("acctSignOut").addEventListener("click", async () => { await firebase.auth().signOut(); });
  window.__onLang = () => {
    setMode(authMode);
    renderAccount();
    const ab3 = document.getElementById("openGateBtn");
    if (ab3) ab3.textContent = cloudUser ? window.t("switchAccount") : window.t("signInUp");
  };
})();
