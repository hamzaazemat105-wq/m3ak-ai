/* ============================================================
   M3AK AI — معاك 🇲🇦
   Moroccan companion PWA. Local-first: no server, no tracking.
   Chat runs a local demo engine unless the user connects their
   own OpenAI-compatible AI endpoint in Settings.
   ============================================================ */
"use strict";

/* ---------- Storage ---------- */
const LS_SETTINGS = "m3ak_settings_v1";
const LS_DATA = "m3ak_data_v1";
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const DEFAULT_AI_ENDPOINT = "https://text.pollinations.ai/openai";
const DEFAULT_AI_MODEL = "openai";
const settings = Object.assign({
  name: "", lang: "darija", dark: false, voiceOut: false, memory: false,
  ai: { endpoint: DEFAULT_AI_ENDPOINT, model: DEFAULT_AI_MODEL, key: "", consent: false, enabled: false }
}, load(LS_SETTINGS, {}));
settings.ai = Object.assign({ endpoint: DEFAULT_AI_ENDPOINT, model: DEFAULT_AI_MODEL, key: "", consent: false, enabled: false }, settings.ai || {});
if (!settings.ai.endpoint) settings.ai.endpoint = DEFAULT_AI_ENDPOINT;
if (!settings.ai.model) settings.ai.model = DEFAULT_AI_MODEL;
/* Migration: the Groq route proved unreachable for the owner (login walls on
   Google/GitHub/magic-link, 2026-10-22). Switch stored Groq defaults to the
   keyless free provider and enable real AI — the owner explicitly ordered
   real-AI activation. Personal keys, if ever added, are left untouched. */
if (settings.ai.endpoint === "https://api.groq.com/openai/v1/chat/completions" && !settings.ai.key) {
  settings.ai.endpoint = DEFAULT_AI_ENDPOINT;
  if (settings.ai.model === "llama-3.3-70b-versatile") settings.ai.model = DEFAULT_AI_MODEL;
  settings.ai.consent = true;
  settings.ai.enabled = true;
}
save(LS_SETTINGS, settings);

let data = Object.assign({ tasks: [], goals: [], habits: [] }, load(LS_DATA, {}));
const persistSettings = () => save(LS_SETTINGS, settings);
const persistData = () => save(LS_DATA, data);

/* ---------- Helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const todayStr = (d = new Date()) => d.toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 2600);
}

/* ---------- i18n (UI chrome: Arabic default, French option) ---------- */
const I18N = {
  ar: {
    slogan: "معاك، خطوة بخطوة", start: "بدا", quickPh: "كتب أي حاجة... أنا نسمع ليك",
    heroNote: "أنا مساعد ذكاء اصطناعي، ماشي إنسان ولا معالج نفسي.",
    svcVent: "فضفض معايا", svcVentSub: "مساحة آمنة للهضرة والاستماع",
    svcSolve: "حل مشكلتي", svcSolveSub: "نحلل المشكل ونلقاو حل عملي",
    svcDay: "نظم نهاري", svcDaySub: "مهامي وخطة النهار",
    svcProg: "تقدم ديالي", svcProgSub: "أهدافي وعاداتي وإنجازاتي",
    svcAsk: "سول معاك", svcAskSub: "أسئلة يومية ومساعدة عامة",
    todayTitle: "نهارك اليوم", openDay: "افتح نظم نهاري", tipTitle: "اقتراح هاد الساعة",
    askSub: "سولني على أي حاجة من حياتك اليومية — خدمة، دراسة، تنظيم، أفكار... ونجاوبك بالدارجة.",
    ventSub: "هنا تقدر تهضر براحتك، بلا حكم وبلا ضغط. أنا نسمع ليك أولاً.",
    ventDisclaimer: "هاد المساحة للدعم والاستماع فقط — ماشي علاج نفسي. إلا كنتي في خطر ولا أزمة حادة، تواصل مع شخص كتثق فيه ولا مع الإسعاف 15 / الشرطة 19.",
    helpTypeQ: "كيفاش بغيتي نعاونك؟", helpListen: "سمعني غير", helpFeelings: "عاوني نفهم مشاعري", helpSolution: "بغيت نفكر في حل عملي",
    ventPrivacy: "محادثات الفضفضة ما كتتحفظش تلقائياً — كتبقى غير في هاد الجلسة.",
    solveSub: "شرح ليا المشكل بكلامك، وغادي نفهموه بجوج، نشوفو الخيارات، ونحولو الحل لخطة عملية.",
    chatPh: "كتب رسالتك هنا...", ventPh: "هضر براحتك... أنا نسمع", solvePh: "مثال: عندي مشكل في الخدمة...",
    send: "صيفط",
    taskPh: "شنو هي المهمة؟", prioHigh: "أولوية عالية", prioMed: "متوسطة", prioLow: "منخفضة",
    addTask: "زيد المهمة", cancel: "إلغاء", tabToday: "اليوم", tabWeek: "هاد الأسبوع", tabAll: "الكل",
    suggestPlan: "اقترح عليا خطة النهار", dayReview: "مراجعة نهاية النهار",
    goalsTitle: "أهدافي", goalPh: "هدف جديد... مثال: نتعلم الإنجليزية", add: "زيد",
    habitsTitle: "عاداتي اليومية", habitPh: "عادة جديدة... مثال: رياضة 20 دقيقة",
    habitNote: "نهار فاتك ماشي مشكل — المهم هو ترجع غدا. التقدم كيتبنى بشوية بشوية 🌿",
    settingsTitle: "الإعدادات والتخصيص", setName: "بغيت نعيط ليك بـ", setNamePh: "الاسم ديالك (اختياري)",
    setLang: "لغة المساعد", setDark: "الوضع الداكن", setVoice: "الردود الصوتية (قراءة الأجوبة بصوت عالٍ)",
    setMemory: "الذاكرة: خلي معاك يتذكر الاسم والأهداف ديالي على هاد الجهاز",
    memoryTitle: "شنو حافظ عليا",
    aiTitle: "ربط ذكاء اصطناعي حقيقي",
    aiExplain: "معاك مربوط بمزود ذكاء اصطناعي مجاني (Pollinations) بلا حساب وبلا مفتاح — ملي كيكون مفعّل، رسائل المحادثة كتصيفط لهاد المزود باش تجاوبك بنموذج حقيقي. تقدر تطفيه في أي وقت وترجع للوضع التجريبي المحلي، ولا تربط مفتاحك الخاص (Groq مثلاً) لحدود أحسن.",
    aiEndpoint: "رابط الخدمة (Endpoint)", aiModel: "الموديل", aiKey: "مفتاح API",
    aiConsent: "كنوافق نصيفط رسائل المحادثة لهاد الخدمة الخارجية باش تجاوبني",
    aiEnable: "تفعيل الذكاء الاصطناعي الحقيقي",
    aiGetKey: "المزود المجاني: Pollinations",
    aiTest: "اختبار الاتصال",
    aiWarn: "تنبيه: ملي كيكون الذكاء الحقيقي مفعّل، رسائلك كتخرج لخادم المزود. ما تصيفطش معلومات حساسة بزاف في وضع الفضفضة.",
    privacyTitle: "الخصوصية والأمان", exportData: "تصدير بياناتي (JSON)", deleteAll: "مسح جميع بياناتي",
    install: "تثبيت التطبيق على الهاتف 📲",
    plansTitle: "الباقات (قريباً)", planFree: "الوظائف الأساسية — مجاني دائماً",
    planPlus: "ذكاء اصطناعي أوسع وأدوات تنظيم متقدمة",
    planBiz: "إنتاجية للفرق — بلا أي وصول لمحادثات الموظفين الشخصية",
    plansNote: "الدفع غير مفعّل في هاد النسخة.",
    navHome: "الرئيسية", navAsk: "سول معاك", navVent: "فضفض", navDay: "نهاري", navProg: "تقدمي"
  },
  fr: {
    slogan: "Avec toi, pas à pas", start: "Go", quickPh: "Écris ce que tu veux... je t'écoute",
    heroNote: "Je suis un assistant IA, pas un humain ni un thérapeute.",
    svcVent: "Parle-moi", svcVentSub: "Un espace sûr pour parler et être écouté",
    svcSolve: "Résous mon problème", svcSolveSub: "Analyser le problème et trouver une solution concrète",
    svcDay: "Organise ma journée", svcDaySub: "Mes tâches et mon plan du jour",
    svcProg: "Mon progrès", svcProgSub: "Mes objectifs, habitudes et réussites",
    svcAsk: "Demande à M3AK", svcAskSub: "Questions du quotidien et aide générale",
    todayTitle: "Ta journée", openDay: "Ouvrir l'organisateur", tipTitle: "Suggestion du moment",
    askSub: "Pose-moi tes questions du quotidien — travail, études, organisation, idées...",
    ventSub: "Ici, tu peux parler librement, sans jugement ni pression. Je t'écoute d'abord.",
    ventDisclaimer: "Cet espace est fait pour l'écoute et le soutien — ce n'est pas une thérapie. En cas de danger ou de crise, contacte une personne de confiance, le SAMU 15 ou la police 19.",
    helpTypeQ: "Comment veux-tu que je t'aide ?", helpListen: "Écoute-moi seulement", helpFeelings: "Aide-moi à comprendre mes émotions", helpSolution: "Je veux une solution pratique",
    ventPrivacy: "Les conversations « Parle-moi » ne sont pas enregistrées automatiquement.",
    solveSub: "Explique ton problème avec tes mots, on va le comprendre ensemble et le transformer en plan d'action.",
    chatPh: "Écris ton message...", ventPh: "Parle librement... je t'écoute", solvePh: "Ex : j'ai un problème au travail...",
    send: "Envoyer",
    taskPh: "Quelle est la tâche ?", prioHigh: "Priorité haute", prioMed: "Moyenne", prioLow: "Basse",
    addTask: "Ajouter la tâche", cancel: "Annuler", tabToday: "Aujourd'hui", tabWeek: "Cette semaine", tabAll: "Tout",
    suggestPlan: "Propose-moi un plan de journée", dayReview: "Bilan de fin de journée",
    goalsTitle: "Mes objectifs", goalPh: "Nouvel objectif... ex : apprendre l'anglais", add: "Ajouter",
    habitsTitle: "Mes habitudes quotidiennes", habitPh: "Nouvelle habitude... ex : sport 20 min",
    habitNote: "Un jour manqué, ce n'est pas grave — l'important c'est de revenir demain 🌿",
    settingsTitle: "Paramètres et personnalisation", setName: "Appelle-moi", setNamePh: "Ton prénom (optionnel)",
    setLang: "Langue de l'assistant", setDark: "Mode sombre", setVoice: "Réponses vocales (lecture à voix haute)",
    setMemory: "Mémoire : laisser M3AK retenir mon nom et mes objectifs sur cet appareil",
    memoryTitle: "Ce que M3AK retient de moi",
    aiTitle: "Connecter une vraie IA",
    aiExplain: "M3AK est connecté à un fournisseur d'IA gratuit (Pollinations), sans compte ni clé — quand il est activé, tes messages lui sont envoyés pour générer de vraies réponses. Tu peux le désactiver à tout moment ou brancher ta propre clé (ex : Groq).",
    aiEndpoint: "Endpoint du service", aiModel: "Modèle", aiKey: "Clé API",
    aiConsent: "J'accepte d'envoyer mes messages à ce service externe pour obtenir des réponses",
    aiEnable: "Activer la vraie IA",
    aiGetKey: "Fournisseur gratuit : Pollinations",
    aiTest: "Tester la connexion",
    aiWarn: "Attention : avec la vraie IA activée, tes messages partent vers le serveur du fournisseur. Évite les infos très sensibles en mode « Parle-moi ».",
    privacyTitle: "Confidentialité et sécurité", exportData: "Exporter mes données (JSON)", deleteAll: "Effacer toutes mes données",
    install: "Installer l'app sur le téléphone 📲",
    plansTitle: "Formules (bientôt)", planFree: "Fonctions de base — gratuit pour toujours",
    planPlus: "IA étendue et outils d'organisation avancés",
    planBiz: "Productivité pour équipes — sans aucun accès aux conversations personnelles",
    plansNote: "Le paiement n'est pas activé dans cette version.",
    navHome: "Accueil", navAsk: "Demander", navVent: "Parler", navDay: "Journée", navProg: "Progrès"
  }
};
function applyI18n() {
  const fr = settings.lang === "fr";
  const dict = fr ? I18N.fr : I18N.ar;
  document.documentElement.lang = fr ? "fr" : "ar";
  document.documentElement.dir = fr ? "ltr" : "rtl";
  $$("[data-i18n]").forEach((el) => { const k = el.dataset.i18n; if (dict[k]) el.textContent = dict[k]; });
  $$("[data-i18n-ph]").forEach((el) => { const k = el.dataset.i18nPh; if (dict[k]) el.placeholder = dict[k]; });
}

/* ---------- Navigation ---------- */
const VIEWS = ["home", "ask", "vent", "solve", "day", "progress", "settings"];
function goto(view) {
  VIEWS.forEach((v) => $("#view-" + v)?.classList.toggle("active", v === view));
  $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.goto === view));
  window.scrollTo({ top: 0 });
  if (view === "home") renderHome();
  if (view === "day") renderTasks();
  if (view === "progress") renderProgress();
  if (view === "settings") renderSettings();
}
$$("[data-goto]").forEach((b) => b.addEventListener("click", () => goto(b.dataset.goto)));
$("#settingsBtn").addEventListener("click", () => goto("settings"));

/* ---------- Theme ---------- */
function applyTheme() {
  document.documentElement.dataset.theme = settings.dark ? "dark" : "light";
  $("#themeToggle").textContent = settings.dark ? "☀️" : "🌙";
}
$("#themeToggle").addEventListener("click", () => { settings.dark = !settings.dark; persistSettings(); applyTheme(); });

/* ---------- Home ---------- */
const TIPS = {
  morning: ["ابدأ نهارك بأصعب مهمة — غادي تحس بالخفة من بعدها ☀️", "راجع مهام اليوم دابا واختار 3 أولويات فقط.", "كاس ديال الماء وشوية ديال الحركة قبل ما تبدا 📱"],
  midday: ["خد استراحة قصيرة بعيد على التيليفون — عينيك وعقلك غادي يشكروك 🌿", "إلا بقات ليك غير مهمة وحدة صغيرة، ساليها دابا وغادي تحس بالتقدم.", "تنفس بعمق 4 مرات... يالله، كمل نهارك بهدوء."],
  evening: ["راجع شنو ساليتي اليوم وافتخر بيه، وخلي الباقي لغدا بلا ضغط 🌙", "حضّر أول مهمة لغدا باش تبدا الصباح بلا تفكير.", "النهار سالا — وقت الراحة مهم بحال وقت الخدمة."]
};
function timeBucket() { const h = new Date().getHours(); return h < 12 ? "morning" : h < 18 ? "midday" : "evening"; }
function greetingText() {
  const h = new Date().getHours();
  const name = settings.memory && settings.name ? " " + settings.name : "";
  if (settings.lang === "fr") return (h < 12 ? "Bonjour" : h < 18 ? "Bel après-midi" : "Bonsoir") + name + " 🌿";
  return (h < 5 ? "ليلة سعيدة" : h < 12 ? "صباح الخير" : h < 18 ? "نهارك سعيد" : "مساء الخير") + name + " 🌿";
}
function renderHome() {
  $("#greeting").textContent = greetingText();
  const t = todayStr();
  const todays = data.tasks.filter((x) => x.date === t);
  const done = todays.filter((x) => x.done).length;
  const openHabits = data.habits.length;
  const doneHabits = data.habits.filter((h) => h.checks && h.checks[t]).length;
  const avgGoal = data.goals.length ? Math.round(data.goals.reduce((a, g) => a + (g.progress || 0), 0) / data.goals.length) : 0;
  const fr = settings.lang === "fr";
  $("#todaySummary").innerHTML =
    `<span class="stat">📅 ${fr ? "Tâches du jour" : "مهام اليوم"}: <b>${done}/${todays.length}</b></span>` +
    `<span class="stat">📈 ${fr ? "Objectifs" : "الأهداف"}: <b>${data.goals.length}</b> (${avgGoal}%)</span>` +
    `<span class="stat">🌱 ${fr ? "Habitudes" : "العادات"}: <b>${doneHabits}/${openHabits}</b></span>`;
  $("#todayBar").style.width = (todays.length ? Math.round(done / todays.length * 100) : 0) + "%";
  $("#timeTip").textContent = pick(TIPS[timeBucket()]);
}

/* ============================================================
   CHAT ENGINE — local demo persona (NOT a real AI model).
   Implements the M3AK personality: warm Moroccan Darija,
   listens first, one useful question at a time, no canned loops.
   ============================================================ */
function detectLang(text) {
  if (/[\u0600-\u06FF]/.test(text)) return "d";
  const t = " " + text.toLowerCase().replace(/[^a-zàâäéèêëîïôöùûüç ]/g, " ") + " ";
  const franco = [" ana ", " bghit ", " bghina ", " kifach ", " daba ", " bzzaf ", " bezaf ", " mzyan ", " wakha ", " safi ", " alach ", " ghadi ", " dyal ", " dyali ", " nta ", " nti ", " hna ", " walou ", " walo ", " choukran ", " labas ", " salam ", " khoya ", " khti ", " yallah ", " lyoum ", " gheda ", " zwin ", " sahbi ", " rani ", " kan ", " mazal ", " chwiya ", " kidayr ", " hamdoulah ", " hmdlh ", " ndir ", " nkamal ", " hass ", " hassit ", " mrid ", " skhft ", " taab ", " wahdi ", " bo7di ", " khayf ", " m9ala9 ", " hzin "];
  if (franco.some((w) => t.includes(w))) return "l";
  const fr = [" je ", " tu ", " merci ", " bonjour ", " probleme ", " problème ", " travail ", " fatigue ", " fatigué ", " stress ", " aide ", " veux ", " suis ", " avec ", " pour ", " dans ", " une ", " est ", " les ", " des ", " pas ", " mon ", " ma ", " mes ", " jour ", " soir "];
  if (fr.some((w) => t.includes(w))) return "f";
  return settings.lang === "fr" ? "f" : "l";
}

const CRISIS_KEYS = ["نقتل راسي", "نقتل نفسي", "ننهي حياتي", "الانتحار", "ننتحر", "ما بغيتش نعيش", "بغيت نموت", "suicide", "me tuer", "je veux mourir", "n9tal rassi", "bghit nmout", "نهاية حياتي", "نضر راسي", "نأذي نفسي"];
function crisisReply(lang) {
  if (lang === "f") return "Je t'entends, et ce que tu ressens compte énormément. Je suis une IA, je ne peux pas t'aider comme un humain le ferait — alors s'il te plaît, parle maintenant à une personne de confiance. Si tu es en danger immédiat, appelle le SAMU au 15 ou la police au 19. Tu n'as pas à traverser ça seul.";
  if (lang === "l") return "Ana same3 lik, w li kat7ess bih mohim bzaf. Ana ghir IA, ma n9derch n3awnek kima insan — 3afak, hdar daba m3a chi wahed kat ti9 fih. Ila kounti f khatar daba, 3iyat l is3af 15 wla lbolis 19. Rak machi bo7dek.";
  return "أنا سامع ليك، واللي كتحس بيه مهم بزاف. 💚\nأنا غير ذكاء اصطناعي، ما نقدرش نعاونك كيف إنسان — عفاك، هضر دابا مع شي شخص كتثق فيه (صاحب، فرد من العائلة...).\nإلا كنتي في خطر دابا، عيّط للإسعاف 15 ولا الشرطة 19.\nراك ماشي بوحدك، وهاد اللحظة الصعيبة غادي تدوز.";
}

const FEELINGS = [
  { keys: ["مضغوط", "ضغط", "stress", "مخنوق", "ضاغط"], d: "الضغط", l: "stress w daght", f: "la pression" },
  { keys: ["حزين", "حزن", "مهموم", "triste", "زعلان", "مكئب", "مكتئب", "hzin", "trist"], d: "الحزن والهم", l: "lhozn", f: "la tristesse" },
  { keys: ["تعبان", "عييت", "مرهق", "fatigu", "تعب", "skhft", "taab", "3yit"], d: "التعب والإرهاق", l: "ta3ab", f: "la fatigue" },
  { keys: ["بوحدي", "وحداني", "الوحدة", "seul", "lonely", "bo7di", "wahdi"], d: "حس الوحدة", l: "l wahda", f: "la solitude" },
  { keys: ["خايف", "قلقان", "القلق", "متوتر", "anxieux", "peur", "khayf", "9la9"], d: "القلق والتوتر", l: "l9ala9", f: "l'anxiété" },
  { keys: ["معصب", "غضبان", "تعصبت", "énervé", "m3asab", "ghadab"], d: "العصبية", l: "l3asabiya", f: "la colère" },
  { keys: ["فرحان", "سعيد", "مبسوط", "heureux", "content", "farhan", "mabsout"], d: "الفرحة", l: "lfarha", f: "la joie" },
  { keys: ["ضايع", "ما عارفش", "تايه", "perdu", "daye3", "ma3arafch"], d: "حس الضياع", l: "daye3", f: "le sentiment d'être perdu" }
];
function feelingOf(text) {
  const t = text.toLowerCase();
  return FEELINGS.find((f) => f.keys.some((k) => t.includes(k))) || null;
}

/* Intent banks — replies/questions in 3 registers: d (دارجة عربية), l (franco), f (français) */
const INTENTS = [
  {
    id: "greeting", keys: ["سلام", "صباح الخير", "مساء الخير", "اهلا", "أهلا", "هاي", "bonjour", "salut", "hello", "salam", "labas", "kidayr"],
    replies: {
      d: ["أهلا وسهلا بيك 🌿 كيف داير اليوم؟", "سلام! مرحبا بيك في معاك 💚 كيفاش نقدر نعاونك اليوم؟", "أهلاً بيك! نهارك كيف دايز؟"],
      l: ["Salam w marhba bik 🌿 Kidayr lyoum?", "Ahla bik! Kifach n9der n3awnek lyoum?", "Salam salam! Labas? Gol lia ach kayn."],
      f: ["Bonjour et bienvenue 🌿 Comment se passe ta journée ?", "Salut ! Ravi de te voir. Comment puis-je t'aider aujourd'hui ?", "Bonjour ! Dis-moi ce qui t'amène."]
    },
    questions: { d: ["شنو جابك لعندنا اليوم؟"], l: ["Ach jabek lyoum?"], f: ["Qu'est-ce qui t'amène aujourd'hui ?"] }
  },
  {
    id: "howareyou", keys: ["كيف داير", "لاباس", "شنو خبارك", "comment vas tu", "comment ça va", "ca va", "cv?", "kidayr", "labas"],
    replies: {
      d: ["أنا بخير، شكراً حيت سولتي 🌿 المهم هو نتا: كيف داير بصح؟", "تمام الحمد لله! ونتا، كيف دايز نهارك؟"],
      l: ["Ana bikhir, choukran 🌿 L mohim howa nta: kidayr bsa7?", "Labas hamdoulah! W nta, kif dayez nharek?"],
      f: ["Je vais bien, merci 🌿 L'important c'est toi : comment vas-tu, vraiment ?", "Très bien ! Et toi, comment se passe ta journée ?"]
    },
    questions: { d: ["شنو أحسن حاجة وقعات ليك اليوم؟", "واش كاين شي حاجة شاغلة بالك؟"], l: ["Ach hiya ahsan haja w93at lik lyoum?"], f: ["Quelle est la meilleure chose qui te soit arrivée aujourd'hui ?"] }
  },
  {
    id: "stressed", keys: ["مضغوط", "ضغط", "مخنوق", "stress", "ضاغط", "راسي غادي ينفجر", "daght", "mkhnou9", "stressé"],
    replies: {
      d: ["سمعتك... الضغط كيخلي حتى الحوايج الصغار يبانو كبار. أنا هنا معاك، بشوية بشوية 💚", "مفهوم عليك — ملي كيتجمع الضغط، الواحد كيحس براسو مخنوق. أنا سامع ليك، هضر براحتك."],
      l: ["Same3 lik... stress kaykhali hta lhwaij sghar ybanou kbar. Ana hna m3ak, b chwiya b chwiya 💚", "Mfhoum 3lik — mli kaytjama3 stress, lwahed kayhess b rasso mkhnou9. Ana same3 lik, hdar b ra7tek."],
      f: ["Je t'entends... la pression rend même les petites choses énormes. Je suis là, on y va doucement 💚", "Je comprends — quand tout s'accumule, on étouffe. Je t'écoute, parle à ton rythme."]
    },
    questions: {
      d: ["شنو أكثر حاجة ضاغطة عليك دابا بالضبط؟", "واش هاد الضغط جاي من الخدمة، القراية، ولا شي حاجة أخرى؟", "من إمتى ونتا حاس بهاد الضغط؟"],
      l: ["Ach hiya aktar haja daghta 3lik daba b dabt?", "Had stress jay men lkhadma, l9raya, wla haja okhra?"],
      f: ["Qu'est-ce qui te met le plus sous pression là, précisément ?", "Cette pression vient du travail, des études, ou d'autre chose ?"]
    }
  },
  {
    id: "sad", keys: ["حزين", "مهموم", "زعلان", "مكتئب", "مكئب", "triste", "hzin", "mhamoum", "قلبي تقيل", "نبكي", "كنبكي"],
    replies: {
      d: ["أنا هنا معاك... الحزن ماشي ضعف، هو إحساس إنساني عادي. هضر براحتك، أنا سامع 🌿", "سمعتك. أوقات الهم كتكون تقيلة على القلب، وما خاصكش تدوزها بوحدك."],
      l: ["Ana hna m3ak... lhozn machi do3f, howa ihsas insani 3adi. Hdar b ra7tek, ana same3 🌿", "Same3 lik. Aw9at lham katkon t9ila 3la l9alb, w ma khasakch tdouzha bo7dek."],
      f: ["Je suis là... la tristesse n'est pas une faiblesse, c'est une émotion humaine. Parle librement, je t'écoute 🌿", "Je t'entends. Les moments de peine sont lourds, tu n'as pas à les traverser seul."]
    },
    questions: {
      d: ["واش وقعات شي حاجة معينة، ولا هاد الإحساس جاك بلا سبب واضح؟", "شنو أكثر حاجة شاغلة بالك في هاد اللحظة؟"],
      l: ["Wach w93at chi haja mo3ayana, wla had l ihsas jak bla sabab wadeh?"],
      f: ["Est-ce qu'il s'est passé quelque chose de précis, ou ce sentiment est venu sans raison claire ?"]
    }
  },
  {
    id: "tired", keys: ["تعبان", "عييت", "مرهق", "ما كنعسش", "النوم", "fatigu", "taab", "3yit", "skhft", "كنفيق تعبان"],
    replies: {
      d: ["التعب كيأثر على كلشي — المزاج والتركيز والطاقة. راحتك ماشي رفاهية، هي ضرورة 🌿", "مفهوم... ملي كيتراكم التعب، خاص الجسم والعقل يرتاحو بصح."],
      l: ["Ta3ab kay2ater 3la kolchi — lmazaj w tarkiz w ta9a. Ra7tek machi rafahia, hiya daroura 🌿", "Mfhoum... mli kaytrakam ta3ab, khas ljism w l3a9l yerta7o bsa7."],
      f: ["La fatigue affecte tout — l'humeur, la concentration, l'énergie. Le repos n'est pas un luxe, c'est une nécessité 🌿", "Je comprends... quand la fatigue s'accumule, le corps et l'esprit ont vraiment besoin de souffler."]
    },
    questions: {
      d: ["واش التعب جسدي ولا حتى النوم ديالك ما بقاش منتظم؟", "شحال ونتا على هاد الحال؟"],
      l: ["Wach ta3ab jasadi wla hta nnoum dyalek ma b9ach montadam?"],
      f: ["C'est une fatigue physique, ou ton sommeil aussi est perturbé ?"]
    }
  },
  {
    id: "lonely", keys: ["بوحدي", "وحداني", "الوحدة", "seul", "bo7di", "wahdi", "ما عندي حد", "حتى واحد ما كيفهمني"],
    replies: {
      d: ["حس الوحدة صعيب، خصوصاً ملي كيكونو الناس حولك وما حاسش بيك حتى واحد. أنا هنا، هضر معايا براحتك 💚", "سمعتك... الوحدة ماشي ديما هي تكون بوحدك، مرات هي ما تلقى حتى واحد يفهمك."],
      l: ["Hess l wahda s3ib, khososan mli kaykounou nass hawlek w ma has bik hta wahed. Ana hna, hdar m3aya b ra7tek 💚", "Same3 lik... l wahda machi dima hiya tkoun bo7dek, marrat hiya ma tal9a hta wahed yafhmek."],
      f: ["La solitude est dure, surtout entouré de gens qui ne te comprennent pas. Je suis là, parle-moi librement 💚", "Je t'entends... être seul, ce n'est pas toujours être sans personne, c'est parfois ne trouver personne qui nous comprenne."]
    },
    questions: {
      d: ["واش كاين شي شخص قريب ليك كنت كتهضر معاه قبل؟", "شنو أكثر لحظة كتحس فيها بالوحدة؟"],
      l: ["Kayn chi shakhs 9rib lik kounti katehdar m3ah 9bal?"],
      f: ["Y a-t-il une personne proche avec qui tu parlais avant ?"]
    }
  },
  {
    id: "family", keys: ["عائلة", "والديا", "والدي", "امي", "ابا", "بابا", "ماما", "خويا", "ختي", "famille", "parents", "3aila", "walidiya"],
    replies: {
      d: ["مشاكل العائلة كتكون حساسة حيت الناس اللي فيهم هما أقرب ناس لينا. أنا سامع ليك، حكي ليا شنو وقع 🌿", "مفهوم... الخلافات مع العائلة كتوجع بزاف. هضر براحتك."],
      l: ["Machakil l3aila katkon hassasa hit nass li fiha homa a9rab nass lina. Ana same3 lik, 7ki lia ach w9a3 🌿", "Mfhoum... lkhilafat m3a l3aila katouja3 bzaf. Hdar b ra7tek."],
      f: ["Les problèmes de famille sont sensibles parce que ce sont nos proches. Je t'écoute, raconte-moi ce qui s'est passé 🌿", "Je comprends... les conflits familiaux font particulièrement mal. Parle librement."]
    },
    questions: {
      d: ["واش جربتي تهضر معاهم بهدوء على هاد الموضوع؟", "شنو النتيجة اللي تتمنى توصل ليها معاهم؟"],
      l: ["Wach jarrabti tehdar m3ahom b hodou3 3la had lmawdou3?"],
      f: ["As-tu essayé d'en parler calmement avec eux ?"]
    }
  },
  {
    id: "work", keys: ["الخدمة", "الشغل", "المدير", "الخدم", "العمل", "الوظيفة", "travail", "boulot", "lkhadma", "patron", "الشركة", "المكتب"],
    replies: {
      d: ["الخدمة كتاخد جزء كبير من نهارنا، فملي كتولي مصدر ضغط كتأثر على كلشي. حكي ليا شنو واقع 🌿", "مفهوم عليك — مشاكل الشغل كتتعب بصح. أنا سامع ليك."],
      l: ["Lkhadma katakod juz2 kbir men nharna, f meli katwali masdar daght kat2ater 3la kolchi. 7ki lia ach wa9e3 🌿", "Mfhoum 3lik — machakil choghl katat3ab bsa7. Ana same3 lik."],
      f: ["Le travail occupe une grande partie de nos journées, quand il devient une source de stress tout est affecté. Raconte-moi 🌿", "Je comprends — les problèmes au boulot épuisent vraiment. Je t'écoute."]
    },
    questions: {
      d: ["شنو بالضبط اللي ما خدامش ليك في الخدمة دابا؟", "واش المشكل في ضغط الشغل، ولا في التعامل مع الناس؟"],
      l: ["Ach b dabt li ma khdamch lik f lkhadma daba?"],
      f: ["Qu'est-ce qui ne va pas exactement au travail en ce moment ?"]
    }
  },
  {
    id: "study", keys: ["القراية", "الدراسة", "امتحان", "الجامعة", "المدرسة", "examen", "études", "etudes", "l9raya", "imtihan", "كنقرا", "الباك", "bac"],
    replies: {
      d: ["القراية والامتحانات كيجيبو ضغط كبير، خصوصاً ملي كتحس بالوقت كيجري. بشوية بشوية، غادي نرتبو الأمور 🌿", "مفهوم... ضغط الدراسة حقيقي. أنا معاك نفكرو بهدوء."],
      l: ["L9raya w limtihanat kayjibou daght kbir, khososan mli kat7ess b lwa9t kayjri. B chwiya b chwiya 🌿", "Mfhoum... daght dirassa ha9i9i. Ana m3ak nfakrou b hodou2."],
      f: ["Les études et les examens amènent beaucoup de pression, surtout quand le temps file. Doucement, on va s'organiser 🌿", "Je comprends... la pression des études est bien réelle. On réfléchit calmement ensemble."]
    },
    questions: {
      d: ["شنو هي المادة ولا الحاجة اللي مقلقاك أكثر؟", "شحال باقي ليك على الامتحان ولا التسليم؟"],
      l: ["Ach hiya lmada wla lhaja li m9al9ak aktar?"],
      f: ["Quelle matière ou échéance t'inquiète le plus ?"]
    }
  },
  {
    id: "money", keys: ["الفلوس", "المال", "الفلوس", "مديون", "الكرا", "argent", "floss", "flous", "المصاريف", "الراتب", "الصالير"],
    replies: {
      d: ["موضوع الفلوس كيقلق بزاف ديال الناس، وما فيه حتى عيب. نهدرو عليه بهدوء ونشوفو شنو ممكن يتبدل 🌿", "مفهوم عليك — الضغط المالي كيثقل على الواحد. أنا سامع ليك."],
      l: ["Mawdou3 lflous kay9alla9 bzaf dyal nass, w ma fih hta 3ib. Nhadrou 3lih b hodou2 🌿", "Mfhoum 3lik — daght lmali kayt9al 3la lwahed. Ana same3 lik."],
      f: ["L'argent inquiète beaucoup de gens, il n'y a aucune honte à ça. Parlons-en calmement 🌿", "Je comprends — la pression financière pèse lourd. Je t'écoute."]
    },
    questions: {
      d: ["شنو هو أكبر مصروف كيضغط عليك هاد الشهر؟", "واش جربتي تدير قائمة بالمصاريف الأساسية وغير الأساسية؟"],
      l: ["Ach howa akbar masrouf kaydaght 3lik had chhar?"],
      f: ["Quelle est la plus grosse dépense qui te pèse ce mois-ci ?"]
    }
  },
  {
    id: "procrast", keys: ["كنأجل", "التسويف", "ما كنبداش", "الكسل", "procrastin", "kan2ajal", "ما عنديش الحماس", "motivation", "التحفيز"],
    replies: {
      d: ["التأجيل ماشي كسل بالضرورة — مرات هو غير الحاجة باينة كبيرة بزاف. الحل: نقسموها لخطوات صغار بزاف 🌿", "مفهوم... أصعب خطوة هي الأولى. إلا بديتي بـ5 دقائق غير، غادي تلقى راسك كملتي."],
      l: ["Ta2jil machi kasal b daroura — marrat howa ghir lhaja bayna kbira bzaf. Lhal: n9asmouha l khotwat sghar 🌿", "Mfhoum... as3ab khotwa hiya lawla. Ila bditi b 5 d9aye9 ghir, ghadi tal9a rassek kamalti."],
      f: ["Procrastiner n'est pas toujours de la paresse — souvent la tâche paraît juste trop grande. La solution : la découper en toutes petites étapes 🌿", "Je comprends... le plus dur c'est de commencer. Commence par 5 minutes seulement, tu verras."]
    },
    questions: {
      d: ["شنو هي الحاجة اللي كتأجلها هاد الأيام؟", "شنو أصغر خطوة تقدر تديرها دابا في 5 دقائق؟"],
      l: ["Ach hiya lhaja li kat2ajalha had lyam?"],
      f: ["Qu'est-ce que tu repousses ces jours-ci ?"]
    }
  },
  {
    id: "happy", keys: ["فرحان", "سعيد", "مبسوط", "نجحت", "ربحت", "heureux", "content", "farhan", "najaht", "اخبار زوينة", "أخبار زوينة"],
    replies: {
      d: ["زوين نسمع هادشي! 🎉 فرحت ليك بصح. حكي ليا شنو وقع!", "ما أحلاها من أخبار 🌿 تستاهل تفرح بهاد اللحظة."],
      l: ["Zwin nasma3 hadchi! 🎉 Fraht lik bsa7. 7ki lia ach w9a3!", "Ma ahlaha men akhbar 🌿 Tastahal tafrah b had lahda."],
      f: ["Ça fait plaisir à entendre ! 🎉 Je suis content pour toi. Raconte-moi !", "Quelle belle nouvelle 🌿 Profite de ce moment, tu le mérites."]
    },
    questions: { d: ["شنو كان أصعب جزء قبل ما توصل لهاد النتيجة؟"], l: ["Ach kan as3ab juz2 9bal ma twassal l had natija?"], f: ["Quelle a été la partie la plus dure avant ce résultat ?"] }
  },
  {
    id: "thanks", keys: ["شكرا", "شكراً", "بارك الله", "merci", "choukran", "thanks"],
    replies: {
      d: ["على الراس والعين 🌿 أنا هنا وقت ما احتجتيني.", "بكل فرح! هادا هو الدور ديالي — نكون معاك.", "الله يخليك 💚 ونتا كيف داير دابا؟"],
      l: ["3la rass w l3in 🌿 Ana hna wa9t ma htajitini.", "B kol farah! Hada howa dor dyali — nkoun m3ak.", "Allah ykhalik 💚 W nta kidayr daba?"],
      f: ["Avec grand plaisir 🌿 Je suis là dès que tu as besoin.", "C'est mon rôle — être avec toi.", "Merci à toi 💚 Et toi, comment tu te sens maintenant ?"]
    },
    questions: { d: [], l: [], f: [] }
  },
  {
    id: "bye", keys: ["بسلامة", "تصبح على خير", "غادي نمشي", "au revoir", "bonne nuit", "bslama", "إلى اللقاء"],
    replies: {
      d: ["بسلامة 🌙 خد راحتك، وأنا هنا ملي ترجع.", "تصبح على خير 🌿 نتمنى ليك نهار/ليلة هادئة."],
      l: ["Bslama 🌙 Khod ra7tek, w ana hna mli tarja3.", "Tasbah 3la khir 🌿 Natmana lik nhar/lila hadia."],
      f: ["À bientôt 🌙 Prends soin de toi, je serai là à ton retour.", "Bonne continuation 🌿 Je te souhaite un moment paisible."]
    },
    questions: { d: [], l: [], f: [] }
  },
  {
    id: "who", keys: ["شكون نتا", "من انت", "من أنت", "qui es tu", "qui es-tu", "chkon nta", "انت روبوت", "واش نتا انسان", "واش نتا إنسان"],
    replies: {
      d: ["أنا «معاك» — مساعد ذكاء اصطناعي مغربي 🌿 ماشي إنسان، ولكن مصمم باش نسمع ليك ونعاونك في التنظيم وحل المشاكل اليومية، بالدارجة وبلا أحكام.", "سميتي معاك (M3AK AI) 💚 أنا برنامج ذكاء اصطناعي، ماشي إنسان ولا معالج — دوري نسمع، نفهم، ونعاون بخطوات عملية."],
      l: ["Ana «M3AK» — mosa3id AI maghribi 🌿 Machi insan, walakin mosamam bach nasma3 lik w n3awnek f tandim w hal machakil, b darija w bla ahkam.", "Smiti M3AK AI 💚 Ana programme AI, machi insan wla mo3alij — dori nasma3, nafham, w n3awen b khotwat 3amalia."],
      f: ["Je suis « M3AK » — un assistant IA marocain 🌿 Je ne suis pas humain, mais je suis conçu pour t'écouter et t'aider au quotidien, en darija, sans jugement.", "Je m'appelle M3AK AI 💚 Je suis un programme d'IA, pas un humain ni un thérapeute — mon rôle : écouter, comprendre, aider concrètement."]
    },
    questions: { d: ["بغيتي نبداو بالفضفضة، ولا عندك مشكل معين نفكرو فيه؟"], l: ["Bghiti nabdaw b lfadfada, wla 3andek mochkil mo3ayan nfakrou fih?"], f: ["On commence par parler librement, ou tu as un problème précis en tête ?"] }
  }
];

const FALLBACK = {
  d: [
    "سمعتك 🌿 زيد شرح ليا شوية باش نفهمك مزيان.",
    "مفهوم... وشنو أكثر حاجة شاغلة بالك في هاد الموضوع؟",
    "أنا معاك، كمل — شنو وقع بالضبط؟",
    "هادشي مهم. واش بغيتي غير تهضر عليه، ولا نفكرو في حل بجوج؟"
  ],
  l: [
    "Same3 lik 🌿 Zid charah lia chwiya bach nafhmek mzyan.",
    "Mfhoum... w ach aktar haja chaghla balek f had lmawdou3?",
    "Ana m3ak, kamal — ach w9a3 b dabt?",
    "Hadchi mohim. Wach bghiti ghir tehdar 3lih, wla nfakrou f hal bjouj?"
  ],
  f: [
    "Je t'écoute 🌿 Explique-moi un peu plus pour bien te comprendre.",
    "Je vois... et qu'est-ce qui te préoccupe le plus dans tout ça ?",
    "Je suis là, continue — que s'est-il passé exactement ?",
    "C'est important. Tu veux juste en parler, ou réfléchir à une solution ensemble ?"
  ]
};
const REFLECT = {
  d: ["بان ليا من كلامك أن ", "كنحس من هضرتك أن ", "اللي وصلني منك هو أن "],
  l: ["Bayen lia men klamek ana ", "Kanhass men hadrtek ana ", "Li wsalni menak howa ana "],
  f: ["J'entends dans tes mots que ", "Je ressens que ", "Ce que je comprends, c'est que "]
};

function matchIntent(text) {
  const t = " " + text.toLowerCase() + " ";
  let best = null, score = 0;
  for (const it of INTENTS) {
    let s = 0;
    for (const k of it.keys) if (t.includes(k.toLowerCase())) s += k.length > 4 ? 2 : 1;
    if (s > score) { score = s; best = it; }
  }
  return score > 0 ? best : null;
}
function freshPick(ctx, bankId, arr) {
  if (!arr || !arr.length) return null;
  ctx.used = ctx.used || {};
  const used = ctx.used[bankId] = ctx.used[bankId] || [];
  const fresh = arr.filter((_, i) => !used.includes(i));
  const pool = fresh.length ? fresh : arr;
  const idx = arr.indexOf(pick(pool));
  used.push(idx);
  if (used.length > arr.length) ctx.used[bankId] = [idx];
  return arr[idx];
}

function engineReply(mode, text, ctx) {
  const lang = detectLang(text);
  if (CRISIS_KEYS.some((k) => text.toLowerCase().includes(k))) return { text: crisisReply(lang), crisis: true };

  // Name capture
  const nameMatch = text.match(/(?:اسمي|سميتي|كنعيط ليا|ana smiti|سميتي هي)\s+([^\s.,!؟?]+)/i) || text.match(/je m'appelle\s+([a-zàâäéèêëîïôöùûüç-]+)/i);
  if (nameMatch && nameMatch[1]) {
    const nm = nameMatch[1].trim();
    ctx.sessionName = nm;
    if (settings.memory) { settings.name = nm; persistSettings(); }
    const r = lang === "f" ? `Enchanté, ${nm} 💚 Je retiendrai ton prénom${settings.memory ? "" : " pour cette conversation"}. Alors, dis-moi ce qui t'amène.`
      : lang === "l" ? `Tcharrafna, ${nm} 💚 Ghadi ntfakar smiytek${settings.memory ? "" : " ghir f had lhdra"}. Yallah, gol lia ach kayn.`
      : `تشرفنا، ${nm} 💚 غادي نتفكر سميتك${settings.memory ? "" : " غير في هاد الهضرة"}. يالله، قولي ليا شنو كاين.`;
    return { text: r };
  }

  const intent = matchIntent(text);
  const feel = feelingOf(text);
  const L = lang;
  let body, bankId;

  if (intent) {
    bankId = "i_" + intent.id;
    body = freshPick(ctx, bankId, intent.replies[L]);
  } else if (feel) {
    bankId = "fb";
    body = freshPick(ctx, bankId, FALLBACK[L]);
    const refl = pick(REFLECT[L]) + feel[L === "d" ? "d" : L === "l" ? "l" : "f"];
    body = (L === "f" ? refl + " te pèse en ce moment. " : refl + (L === "d" ? " كيضغط عليك هاد الأيام. " : " kaydaght 3lik had lyam. ")) + body;
  } else {
    bankId = "fb";
    body = freshPick(ctx, bankId, FALLBACK[L]);
  }

  // Vent + "listen only": no advice, at most a soft prompt, no question every turn
  const helpType = ctx.helpType || "listen";
  let question = null;
  if (intent && intent.questions) {
    const qs = intent.questions[L] || [];
    const unasked = qs.filter((q) => !(ctx.asked || []).includes(q));
    if (unasked.length && (mode !== "vent" || helpType !== "listen" || ctx.turns % 2 === 1)) {
      question = pick(unasked);
      ctx.asked = ctx.asked || []; ctx.asked.push(question);
    }
  }
  if (mode === "vent" && helpType === "solution" && ctx.turns >= 1 && intent && ["stressed", "sad", "work", "study", "money", "procrast"].includes(intent.id)) {
    const sol = L === "f" ? "\n\nSi tu veux, on peut chercher ensemble une toute petite première étape — rien de grand, juste un début."
      : L === "l" ? "\n\nIla bghiti, n9adrou n9albou bjوج 3la awel khotwa sgira — machi haja kbira, ghir bdاية."
      : "\n\nإلا بغيتي، نقدرو نقلبو بجوج على أول خطوة صغيرة — ماشي حاجة كبيرة، غير بداية.";
    body += sol;
  }
  return { text: question ? body + "\n\n" + question : body };
}

/* ---------- Solve-my-problem content ---------- */
const SOLVE_CLARIFY = {
  work: "باش نفهم مزيان: واش المشكل مع المدير/الزملاء، ولا في ضغط الخدمة نفسها؟",
  study: "باش نفهم مزيان: شنو هي المادة/الحاجة الأصعب، وشحال باقي ليك من الوقت؟",
  money: "باش نفهم مزيان: واش المشكل هو الدخل ما كافي، ولا المصاريف خارجة على السيطرة؟",
  family: "باش نفهم مزيان: مع من في العائلة كاين المشكل، وواش جربتي تهضر معاه قبل؟",
  time: "باش نفهم مزيان: شنو هي الحوايج اللي كتاكل ليك وقتك بزاف؟",
  relation: "باش نفهم مزيان: شنو وقع بالضبط بيناتكم آخر مرة؟",
  general: "باش نفهم مزيان: من إمتى بدا هاد المشكل، وشنو جربتي دير حتى دابا؟"
};
const SOLVE_CATS = [
  {
    id: "work", keys: ["خدمة", "شغل", "مدير", "خدم", "عمل", "شركة", "travail", "boulot", "khdma", "patron"],
    options: [
      { t: "نهضر ونوضح الأمور", steps: ["حدد بالضبط شنو هو المشكل في جملة وحدة", "اختار وقت هادئ وطلب اجتماع قصير مع المسؤول", "هضر على الوقائع والأثر، بلا اتهامات", "اقترح حل واحد واقعي واطلب رد واضح", "وثّق الاتفاق في رسالة قصيرة"] },
      { t: "ننظم خدمتي ونخفف الضغط", steps: ["دير قائمة بمهامك اليومية ورتبها حسب الأهمية", "ابدأ النهار بأصعب مهمة", "قول «لا» بلباقة لمهام إضافية فوق طاقتك ووضح السبب", "خد استراحات قصيرة منتظمة", "راجع التقدم في آخر الأسبوع وعدّل الخطة"] },
      { t: "نطور راسي ونحضر لفرصة أخرى", steps: ["حدد مهارة وحدة مطلوبة في سوق الشغل", "خصص 30 دقيقة يومياً للتعلم (دورات مجانية)", "حدّث سيرتك الذاتية كل أسبوعين", "تواصل مع ناس في مجالك ووسع شبكتك", "قدم على فرص جديدة بلا ما تترك خدمتك الحالية حتى تتوفر البديل"] }
    ]
  },
  {
    id: "study", keys: ["قراية", "دراسة", "امتحان", "جامعة", "مدرسة", "examen", "etudes", "9raya", "باك", "bac"],
    options: [
      { t: "خطة مراجعة واقعية", steps: ["قسم المنهج لوحدات صغيرة", "رتب الوحدات: الأصعب والأهم أولاً", "راجع بجلسات 25 دقيقة + 5 دقائق راحة", "اختبر راسك بأسئلة بدل غير القراءة", "خلي آخر نهار قبل الامتحان للمراجعة الخفيفة فقط"] },
      { t: "نحارب التأجيل ونبدا دابا", steps: ["اختار أصغر درس وابدأ بيه في 10 دقائق", "بعد التيليفون في غرفة أخرى وقت المراجعة", "كافئ راسك بعد كل جلسة", "سجل تقدمك يومياً في ورقة/تطبيق", "راجع مع صديق مرة في الأسبوع"] }
    ]
  },
  {
    id: "money", keys: ["فلوس", "مال", "مديون", "كرا", "مصاريف", "argent", "flous", "راتب", "صالير"],
    options: [
      { t: "نرتب المصاريف ونوقف النزيف", steps: ["كتب جميع المصاريف ديال آخر شهر", "قسمها: ضروري / مهم / كمالي", "وقف ولا نقص مصروف كمالي واحد كبير", "حدد سقف أسبوعي للمصاريف المتغيرة", "راجع القائمة كل جمعة وعدّل"] },
      { t: "نزيد الدخل بخطوات صغيرة", steps: ["حدد مهارة عندك تقدر تتباع (تصميم، كتابة، ترجمة...)", "اعرض خدمة صغيرة على معارفك/منصات العمل الحر", "بع حاجة ما كتستعملهاش في الدار", "خصص ساعتين في الأسبوع لهاد الدخل الإضافي", "اعتبر أول ربح كبداية وطور العرض ديالك"] }
    ]
  },
  {
    id: "family", keys: ["عائلة", "والديا", "والدي", "امي", "ابا", "بابا", "ماما", "خويا", "ختي", "famille", "3aila"],
    options: [
      { t: "حوار هادئ ومباشر", steps: ["اختار وقت ما يكون فيه حتى واحد معصب", "ابدأ بـ«أنا كنحس» بدل الاتهام", "اسمع للطرف الآخر حتى يكمل بلا مقاطعة", "اتفقا على حل وسط واحد محدد", "رجعوا للموضوع بعد أسبوع وشوفوا النتيجة"] },
      { t: "نحط حدود بلا ما نقطع العلاقة", steps: ["حدد شنو هو السلوك اللي كيضرك بالضبط", "عبر على حدك بجملة قصيرة وواضحة ومحترمة", "كرر الحد بهدوء إلا تجاوز", "قلل الاحتكاك في المواضيع الحساسة مؤقتاً", "حافظ على المبادرات الطيبة الصغيرة"] }
    ]
  },
  {
    id: "time", keys: ["وقت", "تنظيم", "نهار", "كنضيع", "temps", "organisation", "wa9t", "ما كنلحقش"],
    options: [
      { t: "نظام النهار البسيط", steps: ["كل ليلة، كتب 3 مهام فقط لغدا", "حدد لكل مهمة وقت تقريبي", "ابدأ بالأهم قبل التيليفون", "خلي فترات فارغة للطوارئ", "راجع في آخر النهار: شنو سالا وشنو يتنقل لغدا"] },
      { t: "نقص المشتتات", steps: ["حدد أكبر مشتت عندك (غالباً التيليفون)", "سكر الإشعارات غير الضرورية", "خدم بجلسات مركزة 25 دقيقة", "خصص وقت محدد للرسائل والسوشيال ميديا", "كافئ راسك بعد الجلسات المركزة"] }
    ]
  },
  {
    id: "relation", keys: ["علاقة", "صاحبي", "صاحبتي", "حبيبي", "خطيبي", "الزواج", "relation", "couple"],
    options: [
      { t: "نتواصل بوضوح", steps: ["فكر شنو بغيتي بالضبط قبل ما تهضر", "اختار وقت ومكان مناسبين للحوار", "عبر على مشاعرك بلا لوم ولا تعميم", "اسمع الرد حتى للآخر", "اتفقا على خطوة وحدة عملية"] },
      { t: "نعطي مسافة ونراجع راسي", steps: ["خد يوم ولا يومين تفكر بهدوء", "كتب شنو كتحس بيه وشنو تحتاج", "راجع: واش هاد العلاقة كتزيدك ولا كتنقصك؟", "هضر مع شخص كتثق فيه", "قرر الخطوة الجاية بعقل هادئ ماشي في لحظة غضب"] }
    ]
  },
  {
    id: "general", keys: [],
    options: [
      { t: "نفكك المشكل ونبدا صغير", steps: ["كتب المشكل في جملة وحدة واضحة", "قسمو لأجزاء صغيرة", "اختار أسهل جزء وابدأ بيه اليوم", "حدد موعد تراجع فيه النتيجة", "عدّل الخطة حسب شنو تعلمتي"] },
      { t: "نطلب مساعدة ونوسع الخيارات", steps: ["حدد شخص/جهة تقدر تعاون في هاد الموضوع", "حضر سؤالك بوضوح قبل ما تسول", "سجل جميع الأفكار بلا ما تحكم عليها", "اختار أفضل فكرة واقعية", "جربها على نطاق صغير أولاً"] }
    ]
  }
];
function solveCategory(text) {
  const t = text.toLowerCase();
  for (const c of SOLVE_CATS) if (c.keys.some((k) => t.includes(k))) return c;
  return SOLVE_CATS[SOLVE_CATS.length - 1];
}

/* ============================================================
   CHAT UI + real-AI bridge + voice
   ============================================================ */
const SYSTEM_PROMPT = `أنت «معاك» (M3AK AI)، مساعد شخصي مغربي ذكي ورفيق يومي. تتحدث بالدارجة المغربية الطبيعية (وتفهم العربية الفصحى، والفرنسية، والدارجة المكتوبة بالحروف اللاتينية/الأرقام، والمزج بين الدارجة والفرنسية). رد بنفس لغة المستخدم وروحه.

قواعد صارمة:
- كن دافئاً، محترماً، طبيعياً — ماشي روبوت رسمي. ردود قصيرة نسبياً ومناسبة للموقف.
- استمع أولاً، لا تتسرع في النصائح. اطرح سؤالاً واحداً مفيداً فقط في كل رد.
- إذا أراد المستخدم الفضفضة فقط، لا تفرض الحلول. إذا طلب حلاً، قدم خطوات بسيطة وواقعية.
- استعمل الإيموجي باعتدال. تجنب الأحكام والتوبيخ والوعود غير الواقعية والعبارات الجاهزة المكررة.
- تذكر سياق المحادثة ولا تكرر الأسئلة.
- وضّح عند الحاجة أنك ذكاء اصطناعي داعم، لست إنساناً ولا معالجاً نفسياً. ممنوع التشخيصات والعلاجات الطبية.
- في حالات الخطر أو الأفكار الانتحارية: تعاطف بقوة، وشجع المستخدم على التواصل فوراً مع شخص موثوق أو الإسعاف 15 أو الشرطة 19 (المغرب).
- أوضاع المحادثة: «فضفض معايا» = استماع ودعم عاطفي غير علاجي. «حل مشكلتي» = تحليل منظم: فهم، أسئلة، خيارات، ثم خطوات عملية. «سول معاك» = مساعدة عامة يومية.
- لا تشجع أبداً على التعلق العاطفي المفرط بك أو الاستغناء عن العلاقات الإنسانية.`;

const chats = {
  ask: { box: "askMessages", ctx: { used: {}, asked: [], turns: 0, history: [] }, opened: false },
  vent: { box: "ventMessages", ctx: { used: {}, asked: [], turns: 0, history: [], helpType: null }, opened: false },
  solve: { box: "solveMessages", ctx: { used: {}, asked: [], turns: 0, history: [] }, opened: false, stage: "describe", problem: "", cat: null }
};

function updateAiChip() {
  const chip = $("#aiStatus");
  const live = aiReady();
  chip.textContent = live ? (settings.lang === "fr" ? "IA connectée" : "ذكاء حقيقي متصل") : (settings.lang === "fr" ? "Mode démo" : "وضع تجريبي");
  chip.classList.toggle("live", live);
}
function aiReady() {
  const a = settings.ai;
  return !!(a.enabled && a.consent && a.endpoint && (a.key || a.endpoint.includes("pollinations.ai")));
}

function speak(text) {
  if (!settings.voiceOut || !("speechSynthesis" in window)) return;
  try {
    speechSynthesis.cancel();
    const clean = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").slice(0, 400);
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "ar-SA"; u.rate = 1;
    speechSynthesis.speak(u);
  } catch {}
}

function addMsg(chatId, who, text, options) {
  const box = $("#" + chats[chatId].box);
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.textContent = text;
  if (options && options.length) {
    options.forEach((o) => {
      const b = document.createElement("button");
      b.className = "opt-btn"; b.type = "button"; b.textContent = o.label;
      b.addEventListener("click", () => { [...div.querySelectorAll(".opt-btn")].forEach((x) => x.disabled = true); o.onClick(); });
      div.appendChild(b);
    });
  }
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  if (who === "bot") speak(text);
  return div;
}
function showTyping(chatId) {
  const box = $("#" + chats[chatId].box);
  const t = document.createElement("div");
  t.className = "typing"; t.textContent = settings.lang === "fr" ? "M3AK écrit..." : "معاك كيكتب...";
  box.appendChild(t); box.scrollTop = box.scrollHeight;
  return t;
}

async function aiChat(mode, ctx, userText) {
  const modeNote = mode === "vent" ? "\nالوضع الحالي: فضفض معايا (استماع ودعم)." : mode === "solve" ? "\nالوضع الحالي: حل مشكلتي (تحليل وخطوات)." : "\nالوضع الحالي: سول معاك (مساعدة عامة).";
  const messages = [{ role: "system", content: SYSTEM_PROMPT + modeNote }, ...ctx.history.slice(-12)];
  const res = await fetch(settings.ai.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(settings.ai.key ? { "Authorization": "Bearer " + settings.ai.key } : {}) },
    body: JSON.stringify({ model: settings.ai.model || DEFAULT_AI_MODEL, messages, temperature: 0.7 })
  });
  if (!res.ok) throw new Error("AI HTTP " + res.status);
  const j = await res.json();
  const out = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  if (!out) throw new Error("AI empty");
  return out.trim();
}

async function botRespond(chatId, userText) {
  const chat = chats[chatId];
  const ctx = chat.ctx;
  ctx.turns++;
  ctx.history.push({ role: "user", content: userText });
  const typing = showTyping(chatId);
  const finish = (text) => {
    typing.remove();
    addMsg(chatId, "bot", text);
    ctx.history.push({ role: "assistant", content: text });
  };
  if (aiReady()) {
    try {
      const out = await aiChat(chatId, ctx, userText);
      finish(out);
      return;
    } catch (e) {
      typing.remove();
      addMsg(chatId, "system", settings.lang === "fr" ? "La connexion IA a échoué — retour au mode démo local." : "الاتصال بالذكاء الاصطناعي ما خدامش دابا — رجعنا للوضع التجريبي المحلي.");
      const r = engineReply(chatId, userText, ctx);
      finish(r.text);
      return;
    }
  }
  const r = engineReply(chatId, userText, ctx);
  setTimeout(() => finish(r.text), 450 + Math.random() * 450);
}

/* ----- Solve flow ----- */
function solveHandle(userText) {
  const chat = chats.solve;
  const ctx = chat.ctx;
  ctx.turns++;
  if (CRISIS_KEYS.some((k) => userText.toLowerCase().includes(k))) {
    addMsg("solve", "bot", crisisReply(detectLang(userText)));
    return;
  }
  if (chat.stage === "describe") {
    chat.problem = userText;
    chat.cat = solveCategory(userText);
    const typing = showTyping("solve");
    setTimeout(() => {
      typing.remove();
      addMsg("solve", "bot", "فهمت عليك 🌿 هادا هو المشكل كيف ما شرحتيه:\n«" + userText + "»\n\n" + (SOLVE_CLARIFY[chat.cat.id] || SOLVE_CLARIFY.general));
      chat.stage = "clarify";
    }, 600);
    return;
  }
  if (chat.stage === "clarify") {
    const typing = showTyping("solve");
    setTimeout(() => {
      typing.remove();
      const opts = chat.cat.options;
      addMsg("solve", "bot", "تمام، دابا الصورة واضحة أكثر. هاهوما خيارات واقعية تقدر تختار منها — كليكي على اللي يناسبك:", opts.map((o, i) => ({
        label: (i + 1) + ". " + o.t,
        onClick: () => showPlan(i)
      })));
      chat.stage = "choose";
    }, 600);
    return;
  }
  if (chat.stage === "choose") {
    const n = parseInt(userText.trim(), 10);
    if (n >= 1 && n <= chat.cat.options.length) { showPlan(n - 1); return; }
    addMsg("solve", "bot", "اختار رقم الخيار من القائمة اللي فوق، ولا كليكي عليه مباشرة 👆");
    return;
  }
  if (chat.stage === "done") {
    addMsg("solve", "bot", "إلا بغيتي نفكرو في مشكل آخر، كتبو ليا هنا ونبداو من جديد 🧩");
    chat.stage = "describe";
    return;
  }
}
function showPlan(idx) {
  const chat = chats.solve;
  const opt = chat.cat.options[idx];
  chat.stage = "done";
  const area = $("#solvePlanArea");
  area.innerHTML = "";
  const box = document.createElement("div");
  box.className = "plan-box";
  box.innerHTML = "<h4>🧩 الخطة: " + esc(opt.t) + "</h4><ol>" + opt.steps.map((s) => "<li>" + esc(s) + "</li>").join("") + "</ol>";
  const btn = document.createElement("button");
  btn.className = "btn primary"; btn.textContent = "حوّل الحل إلى خطة في مهامي ✅";
  btn.addEventListener("click", () => {
    opt.steps.forEach((s) => data.tasks.push({ id: uid(), title: s, date: todayStr(), time: "", prio: "med", done: false, createdAt: todayStr() }));
    persistData();
    btn.disabled = true; btn.textContent = "تزادت في «نظم نهاري» ✅";
    toast("تزادت الخطة في مهامك");
    addMsg("solve", "bot", "صافي ✅ حولت الخطوات لمهام في «نظم نهاري» بتاريخ اليوم. تقدر تبدا بأول خطوة دابا، وتكمل الباقي بشوية بشوية. بالتوفيق 🌿");
  });
  const btn2 = document.createElement("button");
  btn2.className = "btn ghost"; btn2.textContent = "رجوع للخيارات";
  btn2.style.marginInlineStart = "8px";
  btn2.addEventListener("click", () => { chat.stage = "choose"; addMsg("solve", "bot", "رجعنا للخيارات — كليكي على الخيار اللي يناسبك:", chat.cat.options.map((o, i) => ({ label: (i + 1) + ". " + o.t, onClick: () => showPlan(i) }))); });
  box.appendChild(btn); box.appendChild(btn2);
  area.appendChild(box);
  area.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ----- Chat openers & chips ----- */
const OPENERS = {
  ask: () => settings.lang === "fr" ? "Bonjour 🌿 Je suis M3AK. Pose-moi ta question ou raconte-moi ce qui te préoccupe — travail, études, organisation, idées... Je réponds simplement et sans détour." : "أهلا وسهلا بيك في «سول معاك» 💬\nسولني على أي حاجة: تنظيم الوقت، القراية، الخدمة، أفكار مشاريع، ولا غير هضر معايا. أنا هنا.",
  vent: () => settings.lang === "fr" ? "Bienvenue dans ton espace 💚\nIci tu peux parler librement, sans jugement. Je t'écoute d'abord — dis-moi, comment tu te sens aujourd'hui ?" : "أهلا وسهلا بيك 💚🌿\nمرحبا بيك في فضفض معايا — هنا تقدر تهضر براحتك وبلا ما تحس براسك محكوم عليك.\nأنا هنا نسمع ليك ونعاونك ترتب أفكارك، بشوية بشوية.\nقولي ليا، كيفاش حاس براسك اليوم؟",
  solve: () => settings.lang === "fr" ? "On va démêler ton problème ensemble 🧩 Décris-le-moi avec tes mots, en une ou deux phrases." : "مرحبا بيك في «حل مشكلتي» 🧩\nشرح ليا المشكل بكلامك، في جملة ولا جوج — وغادي نفهموه بجوج ونلقاو خطوات عملية."
};
function openChat(chatId) {
  const chat = chats[chatId];
  if (chat.opened) return;
  chat.opened = true;
  addMsg(chatId, "bot", OPENERS[chatId]());
}
function setChips(elId, labels, onPick) {
  const el = $("#" + elId);
  el.innerHTML = "";
  labels.forEach((l) => {
    const b = document.createElement("button");
    b.className = "chip"; b.type = "button"; b.textContent = l;
    b.addEventListener("click", () => onPick(l));
    el.appendChild(b);
  });
}

/* ----- Composers ----- */
$$(".composer").forEach((form) => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const chatId = form.dataset.chat;
    const input = form.querySelector(".chat-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    openChat(chatId);
    addMsg(chatId, "user", text);
    if (chatId === "solve") solveHandle(text); else botRespond(chatId, text);
  });
});
function sendToChat(chatId, text) {
  openChat(chatId);
  addMsg(chatId, "user", text);
  if (chatId === "solve") solveHandle(text); else botRespond(chatId, text);
}
$("#quickChatForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#quickChatInput").value.trim();
  if (!v) return;
  $("#quickChatInput").value = "";
  goto("ask");
  sendToChat("ask", v);
});

/* Vent help-type selection */
$$("#helpTypes .chip").forEach((b) => b.addEventListener("click", () => {
  $$("#helpTypes .chip").forEach((x) => x.classList.remove("selected"));
  b.classList.add("selected");
  chats.vent.ctx.helpType = b.dataset.help;
  openChat("vent");
  const msgs = {
    listen: "صافي، غادي نسمع ليك غير — بلا حلول وبلا نصائح حتى تطلبها نتا. هضر براحتك 💚",
    feelings: "مزيان. غادي نعاونك تفهم شنو كتحس بيه بالضبط ونسميو المشاعر بأسمائها. شنو أكثر إحساس حاضر عندك دابا؟",
    solution: "تمام. غادي نسمع ليك أولاً، ومن بعد نفكرو بجوج في خطوات عملية صغيرة. قولي ليا شنو واقع."
  };
  addMsg("vent", "bot", settings.lang === "fr" ? "C'est noté. Parle librement, je t'écoute 💚" : msgs[b.dataset.help]);
}));

/* Chips setup (after language known) */
function setupChips() {
  const fr = settings.lang === "fr";
  setChips("askChips", fr ? ["Comment organiser mon temps ?", "Je suis stressé", "J'ai un examen bientôt", "Je veux progresser"] : ["كيفاش ننظم وقتي؟", "حاس براسي مضغوط", "عندي امتحان وقريب", "كنأجل كلشي"], (t) => sendToChat("ask", t));
  setChips("ventChips", fr ? ["Aujourd'hui était dur", "Je me sens sous pression", "Je veux juste parler", "Je dors mal"] : ["اليوم كان صعيب", "حاس براسي مضغوط", "بغيت غير نهضر", "ما كنعسش مزيان"], (t) => sendToChat("vent", t));
  setChips("solveChips", fr ? ["Problème au travail", "Je repousse tout", "Stress des examens"] : ["عندي مشكل في الخدمة", "كنأجل كلشي", "ضغط الامتحانات", "مشكل مع العائلة"], (t) => { goto("solve"); sendToChat("solve", t); });
}

/* ----- Voice (Web Speech API — free, browser-native) ----- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  $$(".mic-btn").forEach((btn) => {
    btn.hidden = false;
    btn.addEventListener("click", () => {
      try {
        const rec = new SR();
        rec.lang = settings.lang === "fr" ? "fr-FR" : "ar-MA";
        rec.interimResults = false;
        btn.classList.add("recording");
        rec.onresult = (ev) => {
          const text = ev.results[0][0].transcript;
          const form = btn.closest("form");
          form.querySelector(".chat-input").value = text;
          btn.classList.remove("recording");
          form.requestSubmit();
        };
        rec.onend = () => btn.classList.remove("recording");
        rec.onerror = () => { btn.classList.remove("recording"); toast(settings.lang === "fr" ? "Le micro n'a pas marché" : "الميكرو ما خدامش — جرب تكتب"); };
        rec.start();
      } catch { toast("الصوت غير مدعوم في هاد المتصفح"); }
    });
  });
}

/* Open chats when their view is shown */
const _goto = goto;
goto = function (view) {
  _goto(view);
  if (["ask", "vent", "solve"].includes(view)) openChat(view);
};

/* ============================================================
   TASKS (نظم نهاري) / GOALS & HABITS (تقدم ديالي) / SETTINGS
   ============================================================ */
let editingTaskId = null;
let taskFilter = "today";
const PRIO_W = { high: 0, med: 1, low: 2 };
const PRIO_LABEL = { high: () => settings.lang === "fr" ? "Haute" : "عالية", med: () => settings.lang === "fr" ? "Moyenne" : "متوسطة", low: () => settings.lang === "fr" ? "Basse" : "منخفضة" };

function fmtDate(d) {
  if (!d) return "";
  const t = todayStr();
  const tm = todayStr(new Date(Date.now() + 864e5));
  if (d === t) return settings.lang === "fr" ? "Aujourd'hui" : "اليوم";
  if (d === tm) return settings.lang === "fr" ? "Demain" : "غدا";
  return d;
}
function inWeek(d) {
  if (!d) return false;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const dt = new Date(d + "T00:00:00");
  const diff = (dt - now) / 864e5;
  return diff >= 0 && diff <= 6;
}
function renderTasks() {
  const t = todayStr();
  let list = data.tasks.slice();
  if (taskFilter === "today") list = list.filter((x) => x.date === t || (x.date < t && !x.done));
  if (taskFilter === "week") list = list.filter((x) => inWeek(x.date) || (x.date < t && !x.done));
  list.sort((a, b) => (a.done - b.done) || (PRIO_W[a.prio] - PRIO_W[b.prio]) || String(a.date).localeCompare(String(b.date)) || String(a.time || "").localeCompare(String(b.time || "")));
  const el = $("#taskList");
  if (!list.length) {
    el.innerHTML = '<div class="empty">' + (settings.lang === "fr" ? "Aucune tâche ici pour le moment 🌿 Ajoute ta première tâche ci-dessus." : "ما كاينة حتى مهمة هنا دابا 🌿 زيد أول مهمة من الفوق.") + "</div>";
    return;
  }
  el.innerHTML = "";
  list.forEach((task) => {
    const row = document.createElement("div");
    row.className = "task" + (task.done ? " done" : "");
    const overdue = task.date < t && !task.done;
    row.innerHTML =
      '<input type="checkbox" class="task-check" ' + (task.done ? "checked" : "") + ">" +
      '<div class="task-body"><div class="task-title">' + esc(task.title) + "</div>" +
      '<div class="task-meta"><span>📅 ' + esc(fmtDate(task.date)) + (overdue ? (settings.lang === "fr" ? " (en retard)" : " (متأخرة)") : "") + "</span>" +
      (task.time ? "<span>🕐 " + esc(task.time) + "</span>" : "") +
      '<span class="prio ' + task.prio + '">' + PRIO_LABEL[task.prio]() + "</span></div></div>" +
      '<div class="task-tools"><button class="mini-btn" data-act="edit" title="تعديل">✏️</button><button class="mini-btn" data-act="del" title="حذف">🗑️</button></div>';
    row.querySelector(".task-check").addEventListener("change", (e) => {
      task.done = e.target.checked;
      task.doneAt = task.done ? todayStr() : null;
      persistData(); renderTasks();
      if (task.done) toast(settings.lang === "fr" ? "Bien joué ✅" : "أحسنت ✅ مهمة سالات");
    });
    row.querySelector('[data-act="edit"]').addEventListener("click", () => {
      editingTaskId = task.id;
      $("#taskTitle").value = task.title;
      $("#taskDate").value = task.date || "";
      $("#taskTime").value = task.time || "";
      $("#taskPrio").value = task.prio;
      $("#taskSubmit").textContent = settings.lang === "fr" ? "Enregistrer" : "حفظ التعديل";
      $("#taskCancelEdit").hidden = false;
      $("#taskTitle").focus();
    });
    row.querySelector('[data-act="del"]').addEventListener("click", () => {
      if (!confirm(settings.lang === "fr" ? "Supprimer cette tâche ?" : "متأكد بغيتي تمسح هاد المهمة؟")) return;
      data.tasks = data.tasks.filter((x) => x.id !== task.id);
      persistData(); renderTasks();
    });
    el.appendChild(row);
  });
}
$("#taskForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = $("#taskTitle").value.trim();
  if (!title) return;
  const fields = { title, date: $("#taskDate").value || todayStr(), time: $("#taskTime").value || "", prio: $("#taskPrio").value };
  if (editingTaskId) {
    const t = data.tasks.find((x) => x.id === editingTaskId);
    if (t) Object.assign(t, fields);
    editingTaskId = null;
    $("#taskSubmit").textContent = I18N[settings.lang === "fr" ? "fr" : "ar"].addTask;
    $("#taskCancelEdit").hidden = true;
    toast(settings.lang === "fr" ? "Tâche modifiée ✅" : "تبدلات المهمة ✅");
  } else {
    data.tasks.push(Object.assign({ id: uid(), done: false, createdAt: todayStr(), doneAt: null }, fields));
    toast(settings.lang === "fr" ? "Tâche ajoutée ✅" : "تزادت المهمة ✅");
  }
  persistData();
  e.target.reset();
  $("#taskDate").value = todayStr();
  renderTasks();
});
$("#taskCancelEdit").addEventListener("click", () => {
  editingTaskId = null;
  $("#taskForm").reset(); $("#taskDate").value = todayStr();
  $("#taskSubmit").textContent = I18N[settings.lang === "fr" ? "fr" : "ar"].addTask;
  $("#taskCancelEdit").hidden = true;
});
$$("#taskTabs .tab").forEach((tab) => tab.addEventListener("click", () => {
  $$("#taskTabs .tab").forEach((x) => x.classList.remove("active"));
  tab.classList.add("active");
  taskFilter = tab.dataset.filter;
  renderTasks();
}));

$("#suggestPlanBtn").addEventListener("click", () => {
  const t = todayStr();
  const open = data.tasks.filter((x) => !x.done && (x.date === t || x.date < t))
    .sort((a, b) => PRIO_W[a.prio] - PRIO_W[b.prio]);
  const box = $("#planSuggestion");
  box.hidden = false;
  $("#dayReview").hidden = true;
  if (!open.length) {
    box.innerHTML = "<h4>🌿 " + (settings.lang === "fr" ? "Journée libre" : "نهار خفيف") + "</h4><p>" + (settings.lang === "fr" ? "Aucune tâche ouverte pour aujourd'hui. Profite-en ou ajoute une petite tâche utile." : "ما عندك حتى مهمة مفتوحة اليوم. استمتع بنهارك ولا زيد مهمة صغيرة مفيدة.") + "</p>";
    return;
  }
  const blocks = settings.lang === "fr" ? ["🌅 Matin — le plus important", "☀️ Après-midi", "🌙 Soir — le léger"] : ["🌅 الصباح — الأهم أولاً", "☀️ الظهر/العشية — المتوسط", "🌙 المساء — الخفيف"];
  const groups = [[], [], []];
  open.forEach((task, i) => groups[Math.min(2, Math.floor(i / Math.max(1, Math.ceil(open.length / 3))))].push(task));
  box.innerHTML = "<h4>🗓️ " + (settings.lang === "fr" ? "Plan proposé (suggestion seulement — rien n'est modifié)" : "خطة مقترحة (اقتراح فقط — ما تبدل حتى حاجة في مهامك)") + "</h4>" +
    groups.map((g, i) => g.length ? "<p><strong>" + blocks[i] + "</strong></p><ul>" + g.map((x) => "<li>" + esc(x.title) + "</li>").join("") + "</ul>" : "").join("") +
    "<p>" + (settings.lang === "fr" ? "Commence par la première tâche du matin, le reste suivra 🌿" : "ابدأ بأول مهمة في الصباح، والباقي غادي يتبع 🌿") + "</p>";
});
$("#dayReviewBtn").addEventListener("click", () => {
  const t = todayStr();
  const todays = data.tasks.filter((x) => x.date === t || x.doneAt === t);
  const done = todays.filter((x) => x.done);
  const left = todays.filter((x) => !x.done);
  const box = $("#dayReview");
  box.hidden = false;
  $("#planSuggestion").hidden = true;
  box.innerHTML = "<h4>🌙 " + (settings.lang === "fr" ? "Bilan du jour" : "مراجعة نهاية النهار") + "</h4>" +
    "<p>" + (settings.lang === "fr" ? `Tu as terminé <strong>${done.length}</strong> tâche(s) sur ${todays.length} aujourd'hui.` : `ساليتي <strong>${done.length}</strong> من ${todays.length} مهام اليوم.`) + "</p>" +
    (done.length ? "<ul>" + done.map((x) => "<li>✅ " + esc(x.title) + "</li>").join("") + "</ul>" : "") +
    "<p>" + (left.length
      ? (settings.lang === "fr" ? "Ce qui reste peut passer à demain — sans culpabilité. L'important, c'est la continuité 🌿" : "اللي بقى يقدر يتنقل لغدا — بلا إحساس بالذنب. المهم هو الاستمرارية 🌿")
      : (settings.lang === "fr" ? "Journée complète, bravo 🎉" : "نهار كامل سالا، برافو عليك 🎉")) + "</p>";
});

/* ----- Goals & habits ----- */
function renderProgress() {
  // Weekly summary
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const weekDates = Array.from({ length: 7 }, (_, i) => todayStr(new Date(now - i * 864e5)));
  const doneWeek = data.tasks.filter((x) => x.doneAt && weekDates.includes(x.doneAt)).length;
  const checksWeek = data.habits.reduce((a, h) => a + weekDates.filter((d) => h.checks && h.checks[d]).length, 0);
  const avgGoal = data.goals.length ? Math.round(data.goals.reduce((a, g) => a + (g.progress || 0), 0) / data.goals.length) : 0;
  const fr = settings.lang === "fr";
  $("#weekSummary").innerHTML =
    `<span class="stat">✅ ${fr ? "Tâches finies (7 j)" : "مهام سالات هاد الأسبوع"}: <b>${doneWeek}</b></span>` +
    `<span class="stat">🌱 ${fr ? "Habitudes tenues" : "مرات التزمت بعاداتي"}: <b>${checksWeek}</b></span>` +
    `<span class="stat">🎯 ${fr ? "Progrès moyen des objectifs" : "متوسط تقدم الأهداف"}: <b>${avgGoal}%</b></span>` +
    `<p class="soft-note" style="flex-basis:100%">${fr ? "Chaque petit pas compte. On avance pas à pas 🌿" : "كل خطوة صغيرة كتحسب. كنتقدمو خطوة بخطوة 🌿"}</p>`;

  // Goals
  const gl = $("#goalList");
  gl.innerHTML = data.goals.length ? "" : '<div class="empty">' + (fr ? "Pas encore d'objectifs 🎯 Ajoute ton premier objectif." : "ما كاين حتى هدف بعد 🎯 زيد أول هدف ديالك.") + "</div>";
  data.goals.forEach((g) => {
    const div = document.createElement("div");
    div.className = "goal";
    div.innerHTML = '<div class="goal-top"><span class="goal-title">' + esc(g.title) + '</span><button class="mini-btn" title="حذف">🗑️</button></div>' +
      '<input type="range" min="0" max="100" step="5" value="' + (g.progress || 0) + '">' +
      '<span class="goal-pct">' + (g.progress || 0) + "%</span>";
    div.querySelector("input[type=range]").addEventListener("input", (e) => {
      g.progress = +e.target.value;
      div.querySelector(".goal-pct").textContent = g.progress + "%";
      persistData();
    });
    div.querySelector(".mini-btn").addEventListener("click", () => {
      if (!confirm(fr ? "Supprimer cet objectif ?" : "تمسح هاد الهدف؟")) return;
      data.goals = data.goals.filter((x) => x.id !== g.id);
      persistData(); renderProgress();
    });
    gl.appendChild(div);
  });

  // Habits
  const hl = $("#habitList");
  const t = todayStr();
  hl.innerHTML = data.habits.length ? "" : '<div class="empty">' + (fr ? "Pas encore d'habitudes 🌱 Commence par une seule, toute petite." : "ما كاينة حتى عادة بعد 🌱 بدا بوحدة صغيرة غير.") + "</div>";
  data.habits.forEach((h) => {
    h.checks = h.checks || {};
    let streak = 0;
    const startOffset = h.checks[t] ? 0 : 1;
    for (let i = startOffset; ; i++) {
      const d = todayStr(new Date(Date.now() - i * 864e5));
      if (h.checks[d]) streak++; else break;
    }
    const div = document.createElement("div");
    div.className = "habit";
    div.innerHTML = '<div class="habit-body"><div class="habit-title">' + esc(h.title) + '</div><div class="habit-streak">🔥 ' + streak + " " + (fr ? "jour(s) d'affilée" : "يوم متتالي") + "</div></div>";
    const btn = document.createElement("button");
    btn.className = "habit-check" + (h.checks[t] ? " done" : "");
    btn.textContent = h.checks[t] ? "✅ " + (fr ? "Fait" : "ساليتها") : (fr ? "Fait aujourd'hui" : "درتها اليوم");
    btn.addEventListener("click", () => {
      h.checks[t] = !h.checks[t];
      if (!h.checks[t]) delete h.checks[t];
      persistData(); renderProgress();
    });
    const del = document.createElement("button");
    del.className = "mini-btn"; del.textContent = "🗑️";
    del.addEventListener("click", () => {
      if (!confirm(fr ? "Supprimer cette habitude ?" : "تمسح هاد العادة؟")) return;
      data.habits = data.habits.filter((x) => x.id !== h.id);
      persistData(); renderProgress();
    });
    div.appendChild(btn); div.appendChild(del);
    hl.appendChild(div);
  });
}
$("#goalForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#goalTitle").value.trim();
  if (!v) return;
  data.goals.push({ id: uid(), title: v, progress: 0, createdAt: todayStr() });
  persistData(); e.target.reset(); renderProgress();
  toast(settings.lang === "fr" ? "Objectif ajouté 🎯" : "تزاد الهدف 🎯");
});
$("#habitForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#habitTitle").value.trim();
  if (!v) return;
  data.habits.push({ id: uid(), title: v, checks: {} });
  persistData(); e.target.reset(); renderProgress();
  toast(settings.lang === "fr" ? "Habitude ajoutée 🌱" : "تزادت العادة 🌱");
});

/* ----- Settings ----- */
function renderSettings() {
  $("#setName").value = settings.name || "";
  $("#setLang").value = settings.lang;
  $("#setDark").checked = !!settings.dark;
  $("#setVoice").checked = !!settings.voiceOut;
  $("#setMemory").checked = !!settings.memory;
  $("#aiEndpoint").value = settings.ai.endpoint || "";
  $("#aiModel").value = settings.ai.model || "";
  $("#aiKey").value = settings.ai.key || "";
  $("#aiConsent").checked = !!settings.ai.consent;
  $("#aiEnable").checked = !!settings.ai.enabled;
  renderMemoryBox();
  updateAiChip();
  const aiLine = $("#aiTestStatus");
  if (aiLine) aiLine.textContent = aiReady()
    ? (settings.lang === "fr" ? "La vraie IA est active ✅" : "الذكاء الحقيقي مفعّل ✅")
    : (settings.lang === "fr" ? "Le fournisseur gratuit Pollinations est prêt — aucune clé requise." : "المزود المجاني (Pollinations) مربوط واجد — الذكاء الحقيقي خدام بلا مفتاح.");
}
function renderMemoryBox() {
  const box = $("#memoryBox");
  if (!settings.memory) { box.hidden = true; return; }
  box.hidden = false;
  const fr = settings.lang === "fr";
  const goals = data.goals.map((g) => "<li>🎯 " + esc(g.title) + " (" + (g.progress || 0) + "%)</li>").join("");
  $("#memoryContent").innerHTML =
    "<p><strong>" + (fr ? "Prénom" : "الاسم") + ":</strong> " + (settings.name ? esc(settings.name) : "—") + "</p>" +
    "<p><strong>" + (fr ? "Langue" : "اللغة") + ":</strong> " + settings.lang + "</p>" +
    (goals ? "<p><strong>" + (fr ? "Objectifs" : "الأهداف") + ":</strong></p><ul>" + goals + "</ul>" : "<p>" + (fr ? "Aucun objectif enregistré." : "ما كاين حتى هدف مسجل.") + "</p>") +
    '<p class="soft-note">' + (fr ? "Tout est stocké uniquement sur cet appareil. Les conversations ne sont jamais enregistrées automatiquement." : "كلشي محفوظ غير في هاد الجهاز. المحادثات ما كتتحفظش تلقائياً أبداً.") + "</p>";
}
$("#setName").addEventListener("change", (e) => { settings.name = e.target.value.trim(); persistSettings(); renderMemoryBox(); });
$("#setLang").addEventListener("change", (e) => { settings.lang = e.target.value; persistSettings(); applyI18n(); setupChips(); updateAiChip(); renderHome(); });
$("#setDark").addEventListener("change", (e) => { settings.dark = e.target.checked; persistSettings(); applyTheme(); });
$("#setVoice").addEventListener("change", (e) => { settings.voiceOut = e.target.checked; persistSettings(); if (settings.voiceOut) toast(settings.lang === "fr" ? "Réponses vocales activées 🔊" : "الردود الصوتية تفعّلات 🔊"); });
$("#setMemory").addEventListener("change", (e) => { settings.memory = e.target.checked; persistSettings(); renderMemoryBox(); });
["aiEndpoint", "aiModel", "aiKey"].forEach((id) => $("#" + id).addEventListener("change", (e) => {
  const k = id.replace("ai", "").toLowerCase();
  settings.ai[k] = e.target.value.trim();
  persistSettings(); updateAiChip();
}));
$("#aiConsent").addEventListener("change", (e) => { settings.ai.consent = e.target.checked; persistSettings(); updateAiChip(); });
$("#aiEnable").addEventListener("change", (e) => {
  settings.ai.endpoint = $("#aiEndpoint").value.trim() || DEFAULT_AI_ENDPOINT;
  settings.ai.model = $("#aiModel").value.trim() || DEFAULT_AI_MODEL;
  settings.ai.key = $("#aiKey").value.trim();
  settings.ai.enabled = e.target.checked; persistSettings(); updateAiChip();
  if (e.target.checked && !aiReady()) toast(settings.lang === "fr" ? "Complète l'endpoint, la clé et le consentement pour activer" : "كمل رابط الخدمة والمفتاح والموافقة باش يتفعّل");
  if (e.target.checked && aiReady()) toast(settings.lang === "fr" ? "Vraie IA activée 🤖" : "الذكاء الحقيقي تفعّل 🤖");
});
const aiTestBtn = $("#aiTest");
if (aiTestBtn) aiTestBtn.addEventListener("click", async () => {
  const fr = settings.lang === "fr";
  const status = $("#aiTestStatus");
  const setStatus = (msg) => { if (status) status.textContent = msg; };
  settings.ai.endpoint = $("#aiEndpoint").value.trim() || DEFAULT_AI_ENDPOINT;
  settings.ai.model = $("#aiModel").value.trim() || DEFAULT_AI_MODEL;
  settings.ai.key = $("#aiKey").value.trim();
  persistSettings(); updateAiChip();
  if (!settings.ai.key && !settings.ai.endpoint.includes("pollinations.ai")) {
    setStatus(fr ? "Ajoute d'abord ta clé API." : "زيد مفتاح API ديالك أولاً.");
    toast(fr ? "Clé manquante" : "المفتاح ناقص");
    return;
  }
  aiTestBtn.disabled = true;
  setStatus(fr ? "Test de connexion en cours..." : "كنختبر الاتصال بالمزود...");
  try {
    const res = await fetch(settings.ai.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(settings.ai.key ? { "Authorization": "Bearer " + settings.ai.key } : {}) },
      body: JSON.stringify({ model: settings.ai.model, messages: [{ role: "user", content: "Reply with OK" }], temperature: 0, max_tokens: 5 })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const j = await res.json();
    const out = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!out) throw new Error("empty response");
    if (settings.ai.consent) {
      settings.ai.enabled = true;
      $("#aiEnable").checked = true;
      persistSettings(); updateAiChip();
      setStatus(fr ? "Connexion réussie ✅ La vraie IA est activée." : "الاتصال ناجح ✅ الذكاء الحقيقي تفعّل.");
      toast(fr ? "Vraie IA activée 🤖" : "الذكاء الحقيقي تفعّل 🤖");
    } else {
      setStatus(fr ? "Connexion réussie ✅ Coche le consentement, puis active la vraie IA." : "الاتصال ناجح ✅ علّم على الموافقة، ومن بعد فعّل الذكاء الحقيقي.");
    }
  } catch (err) {
    setStatus((fr ? "Échec du test : " : "فشل الاختبار: ") + err.message + (fr ? ". Vérifie la clé et le modèle." : ". تأكد من المفتاح والموديل."));
  } finally {
    aiTestBtn.disabled = false;
  }
});

$("#exportData").addEventListener("click", () => {
  const out = { exportedAt: new Date().toISOString(), settings: Object.assign({}, settings, { ai: Object.assign({}, settings.ai, { key: undefined }) }), data };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "m3ak-data.json";
  a.click();
  URL.revokeObjectURL(a.href);
});
$("#deleteAll").addEventListener("click", () => {
  if (!confirm(settings.lang === "fr" ? "Tout effacer définitivement (tâches, objectifs, habitudes, réglages) ?" : "غادي يتمسح كلشي نهائياً (المهام، الأهداف، العادات، الإعدادات). متأكد؟")) return;
  localStorage.removeItem(LS_SETTINGS);
  localStorage.removeItem(LS_DATA);
  location.reload();
});

/* ----- PWA install ----- */
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $("#installBtn").hidden = false;
});
$("#installBtn").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $("#installBtn").hidden = true;
});

/* ----- Init ----- */
applyTheme();
applyI18n();
setupChips();
updateAiChip();
$("#taskDate").value = todayStr();
renderHome();
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
