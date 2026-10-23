/* ============================================================
   Work 🎯 — Moroccan concours & jobs radar (public + private).
   Data: concours.json (verified daily against official sources).
   Local-first: tracking/checklists live on the device; optional
   account sync via cloud.js (Firebase). No ads, no tracking.
   ============================================================ */
"use strict";

const LS_SETTINGS = "radar.settings.v1";
const LS_DATA = "radar.data.v1";
const LS_CACHE = "radar.concours.cache.v1";

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const load = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let settings = Object.assign({ dark: false }, load(LS_SETTINGS, {}));
let data = Object.assign({ tracked: [], checks: {}, profile: { age: "", rank: "", sector: "" } }, load(LS_DATA, {}));
data.tracked = Array.isArray(data.tracked) ? data.tracked : [];
data.checks = data.checks || {};
data.profile = Object.assign({ age: "", rank: "", sector: "" }, data.profile || {});

const persistSettings = () => save(LS_SETTINGS, settings);
const persistData = () => { save(LS_DATA, data); if (window.__queueSync) window.__queueSync(); };

/* ---------- Concours data ---------- */
let CONCOURS = [];
let UPDATED_AT = "";
const t = window.t;
function rankLabel(r) { return t("rank" + r); }

function deadlineDate(it) {
  const d = new Date(it.deadline.length <= 10 ? it.deadline + "T23:59:59" : it.deadline);
  return d;
}
function daysLeft(it) {
  const now = new Date();
  const end = deadlineDate(it);
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / 86400000);
}
function isOpen(it) { return deadlineDate(it) >= new Date(Date.now() - 60000); }
function fmtDate(iso) {
  try {
    const d = new Date(iso.length <= 10 ? iso + "T12:00:00" : iso);
    return d.toLocaleDateString(window.dateLocale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return iso; }
}
function fmtDateShort(iso) {
  try {
    const d = new Date(iso.length <= 10 ? iso + "T12:00:00" : iso);
    return d.toLocaleDateString(window.dateLocale(), { day: "numeric", month: "long" });
  } catch { return iso; }
}
function deadlineLabel(it) {
  const dl = daysLeft(it);
  if (!isOpen(it)) return { txt: t("dlClosed"), cls: "closed" };
  if (dl === 0) return { txt: t("dlToday"), cls: "urgent" };
  if (dl === 1) return { txt: t("dlTomorrow"), cls: "urgent" };
  if (dl <= 7) return { txt: t("dlLeft", { n: dl }), cls: "soon" };
  if (dl <= 14) return { txt: t("dlLeft", { n: dl }), cls: "mid" };
  return { txt: t("dlLeft", { n: dl }), cls: "ok" };
}
const byDeadline = (a, b) => deadlineDate(a) - deadlineDate(b);
const openItems = () => CONCOURS.filter(isOpen).sort(byDeadline);
const findItem = (id) => CONCOURS.find((c) => c.id === id);

/* ---------- Toast ---------- */
let toastTimer = null;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ---------- Navigation ---------- */
let currentView = "home";
function goto(view) {
  currentView = view;
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
  $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.goto === view));
  window.scrollTo({ top: 0 });
  if (view === "mine") renderMine();
  if (view === "home") renderHome();
}
$$("[data-goto]").forEach((b) => b.addEventListener("click", () => goto(b.dataset.goto)));

/* ---------- Theme ---------- */
function applyTheme() {
  document.documentElement.dataset.theme = settings.dark ? "dark" : "light";
  $("#themeToggle").textContent = settings.dark ? "☀️" : "🌙";
}
$("#themeToggle").addEventListener("click", () => { settings.dark = !settings.dark; persistSettings(); applyTheme(); });

/* ---------- Rendering: cards ---------- */
function tracked(id) { return data.tracked.includes(id); }
function checkProgress(it) {
  const total = (it.docs || []).length;
  if (!total) return 0;
  const done = (data.checks[it.id] || []).length;
  return Math.round((done / total) * 100);
}
function cardHTML(it) {
  const dl = deadlineLabel(it);
  const isT = tracked(it.id);
  return `<article class="ccard" data-id="${it.id}">
    <div class="ccard-top">
      <span class="sector">${esc(it.sector)}</span>
      ${it.type === "private" ? `<span class="ptype">${t("privateBadge")}</span>` : ""}
      <span class="count ${dl.cls}">${dl.txt}</span>
    </div>
    <h3>${esc(it.title)}</h3>
    <p class="org">🏛️ ${esc(it.org)}</p>
    <div class="meta">
      ${it.posts ? `<span>💼 ${t("postsN", { n: it.posts })}</span>` : ""}
      <span>🎓 ${esc(it.diploma)}</span>
      <span>📍 ${esc(it.region)}</span>
    </div>
    <p class="deadline">🗓️ ${t("deadlineL")} <strong>${fmtDate(it.deadline)}</strong></p>
    <div class="ccard-actions">
      <button class="btn primary" type="button" data-act="open">${t("detailsDocs")}</button>
      <button class="btn star ${isT ? "on" : ""}" type="button" data-act="track" aria-label="track">${isT ? t("trackedB") : t("trackB")}</button>
    </div>
  </article>`;
}
function bindCards(container) {
  $$(".ccard", container).forEach((card) => {
    const id = card.dataset.id;
    $("[data-act='open']", card).addEventListener("click", () => openDetail(id));
    $("[data-act='track']", card).addEventListener("click", () => toggleTrack(id));
  });
}
function toggleTrack(id) {
  const i = data.tracked.indexOf(id);
  if (i >= 0) { data.tracked.splice(i, 1); toast(t("trackRemoved")); }
  else { data.tracked.push(id); toast(t("trackAdded")); }
  persistData();
  renderHome(); renderMine(); updateBadge();
}
function updateBadge() {
  const n = data.tracked.map(findItem).filter((it) => it && isOpen(it)).length;
  const b = $("#mineBadge");
  b.hidden = n === 0; b.textContent = n;
}

/* ---------- Home ---------- */
let activeSector = "all";
let activeType = "all";
let searchTerm = "";
$$("#typeSeg button").forEach((b) => b.addEventListener("click", () => {
  activeType = b.dataset.type;
  $$("#typeSeg button").forEach((x) => x.classList.toggle("on", x === b));
  renderHome();
}));
function renderHome() {
  $("#updatedAt").textContent = UPDATED_AT ? fmtDateShort(UPDATED_AT) + " 2026" : "—";
  const open = openItems();
  const totalPosts = open.reduce((s, it) => s + (it.posts || 0), 0);
  const nearest = open[0];
  $("#statsStrip").innerHTML =
    `<div class="stat"><strong>${open.length}</strong><span>${t("statOpen")}</span></div>` +
    `<div class="stat"><strong>${totalPosts}</strong><span>${t("statPosts")}</span></div>` +
    `<div class="stat"><strong>${nearest ? daysLeft(nearest) : "—"}</strong><span>${t("statNearest")}</span></div>`;

  /* sector chips */
  const sectors = ["all", ...new Set(CONCOURS.map((c) => c.sector))];
  $("#sectorChips").innerHTML = sectors.map((s) => `<button type="button" class="chip ${s === activeSector ? "on" : ""}" data-sector="${esc(s)}">${s === "all" ? t("all") : esc(s)}</button>`).join("");
  $$("#sectorChips .chip").forEach((ch) => ch.addEventListener("click", () => { activeSector = ch.dataset.sector; renderHome(); }));

  /* alerts for tracked items */
  const urgent = data.tracked.map(findItem).filter((it) => it && isOpen(it) && daysLeft(it) <= 7).sort(byDeadline);
  $("#alertBox").innerHTML = urgent.length
    ? `<div class="alert">⏰ <strong>${t("alertTitle")}</strong> ${urgent.map((it) => `${esc(it.org)} — ${deadlineLabel(it).txt}`).join(" • ")}</div>`
    : "";

  const term = searchTerm.trim();
  const list = open.filter((it) =>
    (activeType === "all" || (it.type || "public") === activeType) &&
    (activeSector === "all" || it.sector === activeSector) &&
    (!term || (it.title + " " + it.org + " " + it.diploma + " " + it.region).includes(term))
  );
  $("#concoursList").innerHTML = list.map(cardHTML).join("");
  $("#listEmpty").hidden = list.length > 0;
  bindCards($("#concoursList"));
  updateBadge();
}
$("#searchInput").addEventListener("input", (e) => { searchTerm = e.target.value; renderHome(); });

/* ---------- Detail ---------- */
let detailId = null;
function gcalLink(it) {
  const d = deadlineDate(it);
  const p = (n) => String(n).padStart(2, "0");
  const stamp = (x) => `${x.getFullYear()}${p(x.getMonth() + 1)}${p(x.getDate())}T${p(x.getHours())}${p(x.getMinutes())}00`;
  const end = new Date(d.getTime() + 3600000);
  return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" +
    encodeURIComponent(t("gcalPrefix") + " " + it.title + " — " + it.org) +
    "&dates=" + stamp(d) + "/" + stamp(end) +
    "&details=" + encodeURIComponent(t("gcalDetails") + " " + it.applyUrl);
}
function openDetail(id) {
  const it = findItem(id);
  if (!it) return;
  detailId = id;
  const dl = deadlineLabel(it);
  const isT = tracked(id);
  const checks = data.checks[id] || [];
  const shareTxt = encodeURIComponent(`${t("shareWhat")} ${it.title}\n🏛️ ${it.org}\n${t("shareDl")} ${fmtDate(it.deadline)}\n${t("shareInApp")} https://hamzaazemat105-wq.github.io/m3ak-ai/`);
  $("#detailBox").innerHTML = `
  <article class="detail">
    <div class="ccard-top"><span class="sector">${esc(it.sector)}</span>${it.type === "private" ? `<span class="ptype">${t("privateBadge")}</span>` : ""}<span class="count ${dl.cls}">${dl.txt}</span></div>
    <h2>${esc(it.title)}</h2>
    <p class="org">🏛️ ${esc(it.org)}</p>
    <div class="meta">
      ${it.posts ? `<span>💼 ${t("postsN", { n: it.posts })}</span>` : ""}
      <span>📍 ${esc(it.region)}</span>
      ${it.salary ? `<span>💰 ${esc(it.salary)}</span>` : ""}
    </div>
    <div class="kv"><span>${t("diplomaReq")}</span><strong>${esc(it.diploma)}</strong></div>
    <div class="kv"><span>${t("deadlineApply")}</span><strong>${fmtDate(it.deadline)}</strong></div>
    ${it.exam ? `<div class="kv"><span>${t("examDate")}</span><strong>${fmtDate(it.exam)}</strong></div>` : ""}
    <div class="kv"><span>${t("announcedDate")}</span><strong>${fmtDate(it.announced)}</strong></div>

    <h3>${t("conditionsH")}</h3>
    <ul class="ticks">${(it.conditions || []).map((c) => `<li>${esc(c)}</li>`).join("")}</ul>

    ${(it.docs || []).length ? `
    <h3>${t("docsH")} <small class="muted">${t("docsHint", { p: "@@" }).replace("@@", `<span id="docPct">${checkProgress(it)}</span>`)}</small></h3>
    <div class="docs">
      ${(it.docs || []).map((doc, i) => `<label class="doc"><input type="checkbox" data-doc="${i}" ${checks.includes(i) ? "checked" : ""}><span>${esc(doc)}</span></label>`).join("")}
    </div>` : `<h3>${t("docsFallbackH")}</h3><p class="muted">${t("docsFallbackP")}</p>`}

    <h3>${t("stagesH")}</h3>
    <ol class="steps">${(it.stages || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ol>

    ${it.applyNote ? `<div class="alert soft">💡 ${esc(it.applyNote)}</div>` : ""}

    <div class="detail-actions">
      <a class="btn primary" href="${esc(it.applyUrl)}" target="_blank" rel="noopener">${it.type === "private" ? t("applyPrivate") : t("applyPublic")}</a>
      <a class="btn" href="${esc(it.detailsUrl)}" target="_blank" rel="noopener">${t("fullAd")}</a>
      <a class="btn" href="${gcalLink(it)}" target="_blank" rel="noopener">${t("addCal")}</a>
      <button class="btn star ${isT ? "on" : ""}" type="button" id="detailTrack">${isT ? t("trackedB") : t("trackThisB")}</button>
      <a class="btn" href="https://wa.me/?text=${shareTxt}" target="_blank" rel="noopener">${t("shareWA")}</a>
    </div>
    <p class="muted small">${t("finalNote")}</p>
  </article>`;
  $$("#detailBox [data-doc]").forEach((cb) => cb.addEventListener("change", () => {
    const idx = Number(cb.dataset.doc);
    const arr = data.checks[id] || (data.checks[id] = []);
    const p = arr.indexOf(idx);
    if (cb.checked && p < 0) arr.push(idx);
    if (!cb.checked && p >= 0) arr.splice(p, 1);
    persistData();
    $("#docPct").textContent = checkProgress(it);
  }));
  $("#detailTrack").addEventListener("click", () => { toggleTrack(id); openDetail(id); });
  goto("detail");
}

/* ---------- Eligibility ---------- */
function fillSectors() {
  const sel = $("#chkSector");
  const sectors = [...new Set(CONCOURS.map((c) => c.sector))];
  sel.innerHTML = `<option value="">${t("allSectors")}</option>` + sectors.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
  if (data.profile.sector) sel.value = data.profile.sector;
}
function runCheck() {
  const age = Number($("#chkAge").value || 0);
  const rank = Number($("#chkDiploma").value || 0);
  const sector = $("#chkSector").value;
  if (!age || !rank) { toast(t("fillFirst")); return; }
  data.profile = { age, rank, sector };
  persistData();
  const open = openItems().filter((it) => !sector || it.sector === sector);
  const ok = [], no = [];
  for (const it of open) {
    const reasons = [];
    if (rank < (it.diplomaRank || 0)) reasons.push(t("needRank", { rank: rankLabel(it.diplomaRank) }));
    if (it.maxAge && age > it.maxAge) reasons.push(t("maxAgeR", { age: it.maxAge }));
    (reasons.length ? no : ok).push({ it, reasons });
  }
  $("#chkResults").innerHTML =
    `<h3 class="page-title">${t("suitYou", { n: ok.length })}</h3>` +
    (ok.length ? `<div class="list">${ok.map(({ it }) => cardHTML(it)).join("")}</div>` : `<p class="empty">${t("noSuit")}</p>`) +
    (no.length ? `<h3 class="page-title">${t("notSuitH", { n: no.length })}</h3><div class="list">${no.map(({ it, reasons }) => cardHTML(it).replace("</article>", `<p class="why">🚧 ${reasons.join(" • ")}</p></article>`)).join("")}</div>` : "");
  bindCards($("#chkResults"));
  $("#chkResults").scrollIntoView({ behavior: "smooth" });
}
$("#chkBtn").addEventListener("click", runCheck);

/* ---------- Mine ---------- */
function renderMine() {
  const items = data.tracked.map(findItem).filter(Boolean).sort(byDeadline);
  const open = items.filter(isOpen);
  const closed = items.filter((it) => !isOpen(it));
  const render = (it) => cardHTML(it).replace("</article>", `<div class="prog"><div class="bar"><i style="width:${checkProgress(it)}%"></i></div><span>${t("docsPct", { p: checkProgress(it) })}</span></div></article>`);
  $("#mineList").innerHTML =
    (open.length ? open.map(render).join("") : "") +
    (closed.length ? `<h3 class="page-title">${t("closedH")}</h3>` + closed.map(render).join("") : "");
  $("#mineEmpty").hidden = items.length > 0;
  bindCards($("#mineList"));
  updateBadge();
}

/* ---------- Settings ---------- */
$("#wipeBtn").addEventListener("click", () => {
  if (!confirm(t("wipeConfirm"))) return;
  data = { tracked: [], checks: {}, profile: { age: "", rank: "", sector: "" } };
  persistData();
  renderHome(); renderMine();
  toast(t("wipedToast"));
});

/* ---------- Install (PWA) ---------- */
let deferredInstall = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; showInstall(); });
function showInstall() {
  if (window.matchMedia("(display-mode: standalone)").matches) return;
  $("#installCard").hidden = false;
  $("#installHint").textContent = deferredInstall ? "" : t("installHint");
}
$("#installBtn").addEventListener("click", async () => {
  if (deferredInstall) { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; $("#installCard").hidden = true; }
  else toast(t("installToast"));
});
if (!window.matchMedia("(display-mode: standalone)").matches) showInstall();

/* ---------- Auth gate (first entry) ---------- */
const GATE_KEY = "radar.gate.v1";
function showGate() { const g = $("#authGate"); if (g) g.hidden = false; }
function hideGate() { const g = $("#authGate"); if (g) g.hidden = true; }
window.__hideGate = hideGate;
$("#gateSkip").addEventListener("click", () => { try { localStorage.setItem(GATE_KEY, "skip"); } catch {} hideGate(); });
$("#openGateBtn").addEventListener("click", showGate);

/* ---------- Boot ---------- */
async function boot() {
  let gateSeen = "";
  try { gateSeen = localStorage.getItem(GATE_KEY) || ""; } catch {}
  if (!gateSeen) showGate();
  applyTheme();
  if (data.profile.age) $("#chkAge").value = data.profile.age;
  if (data.profile.rank) $("#chkDiploma").value = data.profile.rank;
  const cached = load(LS_CACHE, null);
  if (cached && Array.isArray(cached.items)) { CONCOURS = cached.items; UPDATED_AT = cached.updatedAt || ""; fillSectors(); renderHome(); }
  try {
    const r = await fetch("concours.json", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      if (j && Array.isArray(j.items)) { CONCOURS = j.items; UPDATED_AT = j.updatedAt || ""; save(LS_CACHE, j); }
    }
  } catch {}
  fillSectors();
  if (data.profile.rank) $("#chkDiploma").value = data.profile.rank;
  renderHome();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}
window.__rerender = () => {
  if (!CONCOURS.length) return;
  fillSectors();
  renderHome();
  renderMine();
  if (currentView === "detail" && detailId) openDetail(detailId);
};
boot();
