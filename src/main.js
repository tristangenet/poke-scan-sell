import "./style.css";
import packageInfo from "../package.json";
import { analyzePhotos } from "./vision.js";
import {
  CONDITIONS,
  TYPES,
  STATUSES,
  money,
  today,
  newCard,
  estimate,
  cardKey,
  readyErrors,
  generateListing,
  safeUrl,
  suggestedCondition,
  listingFingerprint,
  migrateCard,
} from "./domain.js";
import { listCards, saveCard, deleteCard, importCards } from "./storage.js";
import {
  searchCards,
  getCard,
  recognizePhoto,
  resolveCatalogue,
} from "./catalog.js";
import { readPhoto, download } from "./photos.js";
import {
  checkVintedHelper,
  makeVintedDraft,
  sendToVinted,
  getVintedStatus,
  downloadVintedExtension,
} from "./vinted-transfer.js";
const app = document.querySelector("#app");
let cards = [],
  active = null,
  view = "dashboard",
  step = 0,
  quickMode = true,
  quickMessage = "",
  candidates = [],
  busy = false,
  query = "",
  statusFilter = "all";
let vintedHelper = false;
const steps = ["Photos", "Identification", "État", "Estimation", "Annonce"];
const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  scan: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M7 12h10"/>',
  stack: '<path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  camera:
    '<rect x="3" y="6" width="18" height="15" rx="3"/><path d="m8 6 2-3h4l2 3"/><circle cx="12" cy="13" r="4"/>',
  settings:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
};
const icon = (n) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n] || icons.stack}</svg>`;
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const badge = (s) =>
  `<span class="badge ${s === "Publiée" || s === "Vendue" ? "green" : ""}">${esc(s)}</span>`;
const btn = (label, action, cls = "primary", extra = "") =>
  `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
const input = (label, field, value, type = "text", extra = "") =>
  `<label class="field">${label}<input data-field="${field}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const select = (label, field, value, options) =>
  `<label class="field">${label}<select data-field="${field}">${options.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
function toast(message, error = false) {
  const t = document.querySelector("#toast");
  t.textContent = message;
  t.className = error ? "show error" : "show";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = ""), 6000);
}
async function persist() {
  if (!active) return;
  active.updatedAt = new Date().toISOString();
  await saveCard(active);
  const i = cards.findIndex((c) => c.id === active.id);
  if (i < 0) cards.unshift(active);
  else cards[i] = active;
}
function log(action) {
  active.history.push({ at: new Date().toISOString(), action });
}
function shell(content) {
  app.innerHTML = `<aside class="sidebar"><a class="brand" href="#" data-action="dashboard"><img src="/icon.svg" alt=""><span>Poke<span class="brand-light"> Scan Sell</span><small>VOTRE ATELIER DE CARTES</small></span></a><div class="nav-label">ESPACE PERSONNEL</div><nav>${[
    ["dashboard", "grid", "Vue d’ensemble"],
    ["new", "scan", "Scanner une carte"],
    ["inventory", "stack", "Ma collection"],
    ["settings", "settings", "Données & services"],
  ]
    .map(([a, i, l]) =>
      btn(
        icon(i) + l,
        a,
        `nav-item ${view === a || (a === "new" && view === "editor") ? "selected" : ""}`,
      ),
    )
    .join(
      "",
    )}</nav><div class="sidebar-bottom"><span class="dot"></span> Espace local<div>Vos photos restent dans ce navigateur.<br>Exportez régulièrement une sauvegarde.</div>${btn(icon("download") + " Sauvegarder", "export", "sidebar-export")}</div></aside><div class="workspace"><header class="topbar"><div><span class="breadcrumb">MON ATELIER</span><span class="top-path"> / ${view === "editor" ? "Nouvelle annonce" : view === "inventory" ? "Collection" : view === "settings" ? "Paramètres" : "Vue d’ensemble"}</span></div><div class="local-pill"><span class="dot"></span> Stockage local <span class="avatar">T</span></div></header><main>${content}</main><footer>Poke Scan Sell · v${esc(packageInfo.version)} <span>Un outil indépendant pour votre collection.</span></footer></div>`;
}
function cardVisual(c) {
  const photo = c.photos.find((p) => p.side === "front");
  return photo
    ? `<img class="card-photo" src="${esc(photo.data)}" alt="Recto de ${esc(c.name || "la carte")}">`
    : `<div class="card-placeholder">${icon("stack")}<span>À photographier</span></div>`;
}
function collectionGrid(list) {
  return list.length
    ? `<div class="collection-grid">${list.map((c) => `<button class="collection-card" data-action="edit" data-id="${c.id}"><div class="card-image">${cardVisual(c)}${badge(c.status)}</div><div class="card-info"><small>${esc(c.set || "EXTENSION À IDENTIFIER")}</small><h3>${esc(c.name || "Nouvelle carte")}</h3><div class="card-meta"><span>${esc(c.number || "N° à identifier")} · ${esc(c.language.toUpperCase())}</span><strong>${+c.price > 0 ? money(+c.price) : "—"}</strong></div></div></button>`).join("")}</div>`
    : `<div class="empty"><div class="empty-icon">${icon("stack")}</div><h3>Votre prochaine trouvaille commence ici.</h3><p>Ajoutez votre première carte pour préparer sa mise en vente.</p>${btn(icon("plus") + " Ajouter une carte", "new")}</div>`;
}
function renderDashboard() {
  const total = cards.reduce(
    (s, c) =>
      s +
      (c.status !== "Vendue" && c.status !== "Archivée" ? +c.price || 0 : 0),
    0,
  );
  shell(
    `<div class="page-heading"><div><div class="eyebrow">DE LA COLLECTION À LA VENTE</div><h1>Vos cartes. Leur prochain chapitre.</h1><p>Identifiez, estimez et préparez vos annonces dans un seul atelier.</p></div>${btn(icon("plus") + " Ajouter une carte", "new")}</div><section class="hero"><div class="hero-copy"><span class="hero-label">MOINS DE SAISIE. PLUS DE COLLECTION.</span><h2>Une photo.<br>Le début d’une annonce.</h2><p>Retrouvez la bonne référence, comparez les prix<br class="desktop"> et créez une annonce qui inspire confiance.</p>${btn(icon("scan") + " Scanner ma première carte", "new", "light")}<div class="hero-note">Recto + verso · Référence vérifiable · Annonce modifiable</div></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="decor-card back-card"></div><div class="decor-card front-card"><div class="decor-top">POKE SCAN SELL <span>✦</span></div><div class="decor-scene"><div class="orb"></div><span>✧</span></div><div class="decor-lines"><i></i><i></i><i></i></div></div><div class="floating-label">${icon("check")} Chaque détail compte</div></div></section><div class="stats"><article><span>Cartes dans l’atelier</span><strong>${cards.length.toString().padStart(2, "0")}</strong><small>Votre inventaire personnel</small></article><article><span>Annonces prêtes</span><strong>${cards
      .filter((c) => c.status === "Prête")
      .length.toString()
      .padStart(
        2,
        "0",
      )}</strong><small>À transférer vers Vinted</small></article><article><span>Prix de vente cumulés</span><strong>${money(total)}</strong><small>Prix saisis · hors cartes vendues et archivées</small></article></div><div class="section-heading"><div><h2>Dans votre collection</h2><p>Reprenez là où vous en étiez.</p></div>${btn("Tout voir " + icon("arrow"), "inventory", "text-button")}</div>${collectionGrid(cards.slice(0, 4))}<div class="service-note">${icon("check")} <p><strong>Des informations vérifiables, à chaque étape.</strong><br>Catalogue TCGdex · Tendances Cardmarket si disponibles · Publication Vinted assistée.</p></div>`,
  );
}
function renderInventory() {
  const list = cards.filter(
    (c) =>
      (statusFilter === "all" || c.status === statusFilter) &&
      `${c.name} ${c.number} ${c.set}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  shell(
    `<div class="page-heading"><div><div class="eyebrow">VOTRE INVENTAIRE</div><h1>Chaque carte, à sa place.</h1><p>${cards.length} exemplaire(s) enregistré(s) dans ce navigateur.</p></div>${btn(icon("plus") + " Ajouter une carte", "new")}</div><div class="filters"><input id="inventory-search" type="search" placeholder="Rechercher un nom, un numéro, une extension…" aria-label="Rechercher dans la collection" value="${esc(query)}"><select id="status-filter" aria-label="Filtrer par statut"><option value="all">Tous les statuts</option>${STATUSES.map((s) => `<option ${s === statusFilter ? "selected" : ""}>${s}</option>`).join("")}</select></div><div id="collection-results">${collectionGrid(list)}</div>`,
  );
}
function renderSettings() {
  shell(
    `<div class="page-heading"><div><div class="eyebrow">DONNÉES & SERVICES</div><h1>Vous gardez la main.</h1><p>Un espace local, des sources identifiées et aucun mot de passe à partager.</p></div></div><div class="two-cols"><section class="panel"><h2>Vos sauvegardes</h2><p>Les cartes et les photos sont enregistrées avec IndexedDB dans ce navigateur. Elles ne sont pas synchronisées entre appareils. Effacer les données du navigateur les supprime.</p><p>Exportez un fichier JSON pour conserver vos originaux et reprendre votre inventaire ailleurs.</p><div class="actions">${btn(icon("download") + " Exporter l’inventaire", "export")}<label class="button secondary">Restaurer une sauvegarde<input type="file" id="restore" accept="application/json" hidden></label></div><p class="muted">Import limité à 50 Mo. Les exemplaires sont importés sous de nouveaux identifiants, sans remplacer les cartes existantes.</p></section><section class="panel"><h2>Services connectés</h2><div class="service-row"><div><strong>TCGdex</strong><small>Catalogue public & indicateurs de marché</small></div>${badge("Disponible en ligne")}</div><div class="service-row"><div><strong>Tesseract.js</strong><small>Lecture du texte dans votre navigateur</small></div>${badge("OCR local")}</div><div class="service-row"><div><strong>Vinted</strong><small>Remplissage via le compagnon Chrome / Edge</small></div>${badge("Assisté")}</div><p class="muted">L’OCR charge ses modèles depuis cette application. Les recherches transmettent le nom, le numéro et la langue à TCGdex, mais pas vos photos. Le mode IA optionnel envoie recto et verso à OpenAI via votre serveur après votre accord. Le compagnon remplit le formulaire ; vous terminez la publication sur Vinted.</p></section></div><section class="panel"><h2>Analyse photo par IA (optionnelle)</h2><p>Configurez la clé OpenAI uniquement dans le fichier .env du serveur. Ici, saisissez le code d’accès APP_ACCESS_TOKEN de votre instance, jamais la clé OpenAI. Ce code reste dans cet onglet et disparaît à sa fermeture.</p><label class="field">Code d’accès au serveur IA<input id="vision-access" type="password" autocomplete="off" placeholder="Code APP_ACCESS_TOKEN configuré sur le serveur"></label><div class="actions">${btn("Enregistrer le code dans cet onglet", "save-vision-access", "secondary")}${btn("Effacer le code", "clear-vision-access", "text-button")}</div><p class="muted">Le service est optionnel et les appels API sont facturés par le fournisseur. L’identité et l’état proposés restent à confirmer. L’OCR local fonctionne sans cette configuration.</p></section><section class="panel"><h2>Comment les estimations sont calculées</h2><p>Au moins trois comparables confirmés, en euros, de moins de 90 jours, pour la même référence, variante, langue et état. Les marchés et les prix demandés/ventes réalisées sont séparés. Les doublons et prix au-delà de quatre fois ou en dessous du quart de la médiane sont exclus. Une fourchette interquartile est affichée ; elle n’est pas une garantie de vente.</p><p>Les tendances Cardmarket relayées par TCGdex sont des agrégats qui ne certifient ni la langue ni l’état de votre carte. Elles ne sont jamais utilisées seules pour une estimation selon l’état.</p></section>`,
  );
}
function renderEditor() {
  if (!active) return;
  if (quickMode) return renderQuickEditor();
  const e = estimate(active);
  shell(
    `<div class="editor-heading"><div><div class="eyebrow">${esc(active.name || "NOUVEL EXEMPLAIRE")}</div><h1>Préparons votre annonce.</h1>${btn("Revenir au mode rapide", "quick-mode", "text-button")}</div><div class="saved"><span class="dot"></span> Sauvegarde locale ${badge(active.status)}</div></div><div class="steps" role="navigation" aria-label="Étapes de préparation">${steps.map((s, i) => `<button data-action="step" data-step="${i}" class="step ${i === step ? "current" : ""}"><span>${i + 1}</span>${s}</button>`).join("")}</div><div class="editor-layout"><section class="editor-main">${[photosView, identityView, conditionView, priceView, listingView][step](e)}<div class="step-footer">${btn(step ? "← Étape précédente" : "← Ma collection", step ? "previous" : "inventory", "secondary")}${step < 4 ? btn("Continuer " + icon("arrow"), "next") : ""}</div></section><aside class="summary panel"><span class="eyebrow">VOTRE EXEMPLAIRE</span><div class="summary-image">${cardVisual(active)}</div><h3>${esc(active.name || "Carte à identifier")}</h3><p>${esc(active.set || "Extension non précisée")}<br>${esc(active.number || "Numéro à renseigner")} · ${esc(active.language.toUpperCase())}</p><div class="summary-line"><span>Variante</span><strong>${esc(active.variant || "Non précisée")}</strong></div><div class="summary-line"><span>État</span><strong>${esc(active.condition || "À vérifier")}</strong></div><div class="summary-line"><span>Prix choisi</span><strong>${+active.price > 0 ? money(+active.price) : "—"}</strong></div><p class="muted">Un exemplaire unique.<br>Vos modifications sont enregistrées à chaque changement de champ.</p></aside></div>`,
  );
}
function renderQuickEditor() {
  const hasPhotos = ["front", "back"].every((side) =>
    active.photos.some((p) => p.side === side),
  );
  const e = estimate(active);
  const detected =
    active.catalogId ||
    active.ocrText ||
    active.aiAnalysis ||
    active.scanDiagnostics ||
    active.name;
  shell(`<div class="editor-heading"><div><div class="eyebrow">MODE RAPIDE</div><h1>Deux photos. Une annonce.</h1><p>Photographiez, laissez l’application préparer, puis vérifiez.</p></div><div class="saved">${badge(active.status)}</div></div>
    <div class="quick-layout"><section>
    ${!detected ? photosView() : `<details class="panel"><summary>Vos photos (${active.photos.length}) · modifier</summary>${photosView()}</details>`}
    <section class="panel"><h2>Préparation automatique</h2><p>Lecture du nom et du numéro, puis chargement de la tendance Cardmarket si la référence catalogue est identifiée.</p>
    ${select("Langue de la carte", "language", active.language, [
      ["fr", "Français"],
      ["en", "Anglais"],
    ])}
    <label class="check-row"><input id="quick-ai" type="checkbox"> Ajouter l’analyse IA du nom, du numéro et de l’état : envoyer recto et verso à OpenAI via mon serveur configuré (appel facturé).</label>
    <div class="actions">${btn(icon("scan") + (detected ? "Relancer la préparation" : "Préparer ma carte"), "quick-prepare", "primary", !hasPhotos ? "disabled" : "")}${btn("Saisie manuelle / options avancées", "advanced-mode", "text-button")}</div>
    <div id="job-status" role="status">${esc(quickMessage)}</div></section>
    ${
      detected
        ? `<section class="panel"><div class="eyebrow">VÉRIFICATION FINALE</div><h2>Vérifiez, ajustez, puis validez.</h2>
    ${!active.catalogId ? `<p class="notice ${active.name && active.number ? "" : "amber"}">${esc(quickMessage || (active.name && active.number ? "Nom et numéro renseignés. L’édition est facultative." : "Reprenez une photo lisible du nom et du numéro."))}</p>` : `<p class="notice">Carte identifiée automatiquement · ${esc(active.catalogId)}</p>`}
    <div class="form-grid">${input("Nom", "name", active.name)}${input("Numéro", "number", active.number)}</div>
    ${active.ocrText ? `<details><summary>Texte lu dans la photo</summary><pre>${esc(active.ocrText)}</pre></details>` : ""}
    <details><summary>Extension et variante (facultatif)</summary><div class="form-grid">${input("Extension (facultatif)", "set", active.set)}${active.variantOptions?.length ? select("Variante (facultatif)", "variant", active.variant, [["", "Non précisée"], ...[...new Set([...active.variantOptions, active.variant].filter(Boolean))].map((v) => [v, v])]) : input("Variante / édition (facultatif)", "variant", active.variant)}</div></details>
    ${select("État de la carte", "condition", active.condition, [["", "Choisir après vérification"], ...Object.entries(CONDITIONS)])}
    ${active.aiAnalysis ? `<p class="notice">Proposition IA : ${esc(active.aiAnalysis.condition)} · ${esc(active.aiAnalysis.confidence)}. ${active.aiAnalysis.defects.map(esc).join(" ; ")}${active.aiAnalysis.warnings.map((w) => `<br>${esc(w)}`).join("")}</p>` : '<p class="muted">Sans IA configurée, l’état reste à choisir après examen des deux faces.</p>'}
    <label class="field">Défauts constatés<textarea data-field="defectNotes" rows="2">${esc(active.defectNotes)}</textarea></label>
    ${active.defects.length ? `<p class="notice">Défauts déjà enregistrés : ${active.defects.map(esc).join(", ")}. Modifiez-les dans les options avancées.</p>` : ""}
    <div class="quick-price"><h3>Votre prix</h3>${e.available ? `<p>Prix proposé selon vos comparables : ${money(e.price)}</p>${btn("Utiliser le prix conseillé", "apply-price", "secondary")}` : active.market?.trend ? `<p>Tendance Cardmarket : <strong>${money(active.market.trend)}</strong> · ${esc(active.market.updated || "date inconnue")}</p><p class="muted">Agrégat catalogue, sans filtrage par état, langue ou variante exacte. Ajustez le prix à votre exemplaire.</p>${btn("Utiliser cette tendance comme point de départ", "use-trend", "secondary")}` : '<p class="notice">Aucune donnée de prix exploitable disponible. Indiquez votre prix ou consultez les comparables dans les options avancées.</p>'}
    ${input("Prix de vente (€)", "price", active.price, "number", 'min="0.01" step="0.01"')}
    <a class="inline-link" href="https://www.vinted.fr/catalog?search_text=${encodeURIComponent([active.name, active.number, active.set].join(" "))}" target="_blank" rel="noopener noreferrer">Comparer les annonces Vinted ↗</a></div>
    ${btn(active.title ? "Valider et actualiser mon annonce" : "Valider ma carte et créer l’annonce", "quick-validate", "primary", !hasPhotos ? "disabled" : "")}
    <p class="muted">En validant, vous confirmez le nom, le numéro, l’état et les défauts après avoir vérifié les deux faces.</p></section>`
        : ""
    }
    ${active.title ? listingView(true) : ""}
    </section></div>`);
}
async function prepareQuickCard(useAI) {
  quickMessage = "Préparation en cours…";
  active.identityConfirmed = false;
  active.conditionConfirmed = false;
  invalidateListing();
  active.catalogId = "";
  active.market = null;
  active.variantOptions = [];
  active.aiAnalysis = null;
  active.set = "";
  active.variant = "";
  active.ocrText = "";
  active.scanDiagnostics = null;
  active.name = "";
  active.number = "";
  candidates = [];
  let result;
  let aiVariant = "";
  let detectedNumber = "";
  if (useAI) {
    try {
      const ai = await analyzePhotos(active);
      active.aiAnalysis = ai;
      active.name = ai.name || active.name;
      active.number = ai.number || active.number;
      active.set = ai.set || active.set;
      active.variant = ai.variant || "";
      if (["fr", "en"].includes(ai.language)) active.language = ai.language;
      aiVariant = ai.variant || "";
      detectedNumber = ai.number || "";
      if (ai.photosSufficient && ai.condition !== "unknown") {
        active.condition = ai.condition;
        active.defectNotes = ai.defects.join("; ");
      }
      candidates = await searchCards(
        active.name,
        active.number,
        active.language,
      );
    } catch (error) {
      quickMessage = `IA indisponible : ${error.message} La lecture locale prend le relais.`;
      toast(quickMessage, true);
    }
  }
  if (
    !candidates.length &&
    !(active.aiAnalysis?.name && active.aiAnalysis?.number)
  ) {
    let scanStage = "Lecture du recto";
    result = await recognizePhoto(
      active.photos.find((p) => p.side === "front").data,
      active.language,
      (progress) => {
        const status = document.querySelector("#job-status");
        if (status) status.textContent = `${scanStage} : ${progress} %`;
      },
      (stage) => {
        scanStage = stage;
        const status = document.querySelector("#job-status");
        if (status) status.textContent = stage;
      },
    );
    active.ocrText = result.text;
    active.scanDiagnostics = result.diagnostics;
    active.name = result.name || active.aiAnalysis?.name || "";
    detectedNumber = result.number;
    active.number = result.number || active.aiAnalysis?.number || "";
    candidates = result.matches;
  }
  const resolution = await identifyFromEvidence({
    number: detectedNumber || active.number,
    name: active.name,
    set: active.aiAnalysis?.set || "",
    text: result?.text || "",
  });
  if (active.catalogId && aiVariant) active.variant = aiVariant;
  quickMessage = [
    quickMessage.startsWith("IA indisponible") ? quickMessage : "",
    resolution.reason,
    result?.warning,
  ]
    .filter(Boolean)
    .join(" ");
  await persist();
  render();
  toast(
    active.name && active.number
      ? "Carte préparée. Vérifiez les informations lues."
      : quickMessage,
    !active.name || !active.number,
  );
}
function photosView() {
  return `<div class="panel"><div class="eyebrow">${quickMode ? "VOS PHOTOS" : "ÉTAPE 01"}</div><h2>Montrez votre carte sous tous les angles.</h2><p>Posez-la sur un fond uni, en lumière naturelle. Gardez les bords et les défauts visibles.</p><div class="photo-grid">${[
    "front",
    "back",
  ]
    .map((side) => {
      const p = active.photos.find((p) => p.side === side);
      return `<div class="photo-slot">${p ? `<img src="${esc(p.data)}" alt="${side === "front" ? "Recto" : "Verso"} de la carte"><button class="remove-photo" data-action="remove-photo" data-id="${p.id}" aria-label="Supprimer la photo ${side === "front" ? "recto" : "verso"}">×</button>` : `${icon("camera")}<h3>${side === "front" ? "Le recto" : "Le verso"}</h3><p>${side === "front" ? "Nom, numéro et illustration" : "Coins, bords et état général"}</p>`}<label class="button secondary">${p ? "Remplacer" : "Ajouter une photo"}<input class="photo-input" type="file" data-side="${side}" accept="image/jpeg,image/png,image/webp" capture="environment" hidden></label></div>`;
    })
    .join(
      "",
    )}</div><div class="actions"><label class="button secondary">${icon("plus")} Ajouter un détail<input class="photo-input" type="file" data-side="detail" accept="image/jpeg,image/png,image/webp" hidden></label><span class="muted">JPEG, PNG, WebP · 10 Mo/photo · 6 photos maximum</span></div><div class="detail-photos">${active.photos
    .filter((p) => p.side === "detail")
    .map(
      (p) =>
        `<div><img src="${esc(p.data)}" alt="Détail de la carte"><button data-action="remove-photo" data-id="${p.id}" aria-label="Supprimer ce détail">×</button></div>`,
    )
    .join("")}</div>${active.photos
    .flatMap((p) => p.warnings || [])
    .map((w) => `<p class="notice amber">${esc(w)}</p>`)
    .join(
      "",
    )}<p class="notice">Les originaux sont conservés. Aucun filtre n’efface les défauts de votre carte. Vérifiez vous-même la netteté avant de continuer.</p></div>`;
}
function identityView() {
  return `<div class="panel"><div class="eyebrow">ÉTAPE 02</div><h2>Identifiez votre carte.</h2><p>Lisez le texte de la photo ou recherchez dans le catalogue, puis confirmez la référence.</p>${btn(icon("scan") + " Lire la photo avec l’OCR", "ocr", "primary", !active.photos.some((p) => p.side === "front") ? "disabled" : "")}<p class="muted">Lecture locale du texte · premier chargement des modèles nécessaire · pas de reconnaissance d’authenticité.</p><div id="job-status" role="status"></div><div class="form-grid">${input("Nom de la carte", "name", active.name)}${input("Numéro (ex. 4/102)", "number", active.number)}${select(
    "Langue",
    "language",
    active.language,
    [
      ["fr", "Français"],
      ["en", "Anglais"],
    ],
  )}${input("Extension (facultatif)", "set", active.set)}</div><div class="actions">${btn("Rechercher dans le catalogue", "search", "secondary")}</div><div class="candidates">${candidates.map((c) => `<button class="candidate" data-action="candidate" data-id="${esc(c.id)}">${c.image ? `<img src="${esc(c.image)}/low.webp" alt="Illustration catalogue ${esc(c.name)}" loading="lazy">` : ""}<strong>${esc(c.name)}</strong><small>${esc(c.localId)} · ${esc(c.id)}</small><span>Choisir cette référence</span></button>`).join("")}</div>${active.catalogId ? `<p class="notice">Référence catalogue : ${esc(active.catalogId)}. Comparez l’illustration et les indications de votre carte. Une image catalogue n’est pas une photo de votre exemplaire.</p>` : ""}<div class="form-grid">${input("Variante / édition (facultatif)", "variant", active.variant, "text", 'placeholder="Holo, reverse, 1re édition…"')}${active.variantOptions?.length ? `<label class="field">Variantes du catalogue<select id="catalog-variant"><option value="">Choisir après vérification</option>${active.variantOptions.map((v) => `<option ${active.variant === v ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label>` : ""}</div><label class="check-row"><input type="checkbox" data-field="identityConfirmed" ${active.identityConfirmed ? "checked" : ""}> J’ai vérifié le nom, le numéro et la langue sur ma carte. L’extension et la variante sont facultatives.</label>${active.ocrText ? `<details><summary>Texte lu par l’OCR</summary><pre>${esc(active.ocrText)}</pre></details>` : ""}</div>`;
}
function conditionView() {
  return `<div class="panel"><div class="eyebrow">ÉTAPE 03</div><h2>Un état décrit avec précision.</h2><p>Vérifiez votre carte à l’œil nu. Utilisez la liste de contrôle ci-dessous ou demandez une analyse IA optionnelle, puis confirmez votre évaluation.</p>${!active.photos.some((p) => p.side === "back") ? '<p class="notice amber">Ajoutez le verso avant de confirmer l’état.</p>' : ""}${btn("Analyser le recto et le verso par IA", "vision", "secondary", !active.photos.some((p) => p.side === "front") || !active.photos.some((p) => p.side === "back") ? "disabled" : "")}<p class="muted">Nécessite un serveur configuré. Vos deux photos seront envoyées à OpenAI après confirmation.</p>${active.aiAnalysis ? `<div class="notice"><strong>Proposition IA : ${esc(active.aiAnalysis.condition)} · confiance ${esc(active.aiAnalysis.confidence)}</strong><p>${active.aiAnalysis.defects.map(esc).join("<br>") || "Aucun défaut visible signalé ; vérifier à l’œil nu."}</p>${active.aiAnalysis.warnings.map((w) => `<p>${esc(w)}</p>`).join("")}</div>` : ""}<div class="defect-grid">${["Bords blanchis", "Coins usés", "Rayures", "Pliure", "Humidité", "Taches"].map((d) => `<label class="check-row"><input type="checkbox" data-defect="${d}" ${active.defects.includes(d) ? "checked" : ""}>${d}</label>`).join("")}</div><label class="field">Autres défauts et précisions<textarea data-field="defectNotes" rows="3" placeholder="Ex. petit point blanc au dos, coin inférieur droit…">${esc(active.defectNotes)}</textarea></label><div class="notice">Orientation d’après vos observations : <strong>${suggestedCondition(active.defects)}</strong>. Ne vaut pas notation professionnelle. Sans défaut déclaré, vérifiez tout de même les micro-rayures.</div>${select("État retenu par le vendeur", "condition", active.condition, [["", "Choisir un état"], ...Object.entries(CONDITIONS)])}<label class="check-row"><input type="checkbox" data-field="conditionConfirmed" ${active.conditionConfirmed ? "checked" : ""} ${!active.photos.some((p) => p.side === "back") || !active.photos.some((p) => p.side === "front") ? "disabled" : ""}> J’ai vérifié les deux faces et confirmé l’état et les défauts.</label><a class="inline-link" href="https://help.cardmarket.com/fr/CardCondition" target="_blank" rel="noopener noreferrer">Consulter le guide des états Cardmarket ↗</a></div>`;
}
function priceView(e) {
  const m = active.market;
  return `<div class="panel"><div class="eyebrow">ÉTAPE 04</div><h2>Un prix fondé sur des références.</h2><p>Un prix affiché n’est pas forcément un prix de vente réalisé. Gardez des comparables de la même carte, variante, langue et état.</p>${m ? `<div class="market"><div><span class="eyebrow">CARDMARKET VIA TCGDEX</span><h3>Tendance générale ${Number.isFinite(m.trend) ? money(m.trend) : "non disponible"}</h3><small>Mise à jour source : ${esc(m.updated || "inconnue")}</small></div>${badge("Agrégat")}</div><p class="notice amber">Indicateur général de la référence catalogue, non filtré par état/langue et variante exacte non garantie. Il ne constitue pas votre estimation et n’est pas appliqué automatiquement.</p>` : `<p class="notice">${active.catalogId ? "Aucune tendance exploitable retournée pour cette référence." : "Choisissez une référence catalogue pour consulter une tendance si elle est disponible."}</p>`}<div class="actions">${btn("Actualiser les données catalogue", "refresh-market", "secondary", !active.catalogId ? "disabled" : "")}<a class="button secondary" href="https://www.vinted.fr/catalog?search_text=${encodeURIComponent([active.name, active.number, active.set, active.variant].join(" "))}" target="_blank" rel="noopener noreferrer">Rechercher sur Vinted ↗</a></div><hr><h3>Vos comparables vérifiés</h3><form id="observation-form"><div class="form-grid"><label class="field">Source<select name="source"><option>Vinted</option><option>Cardmarket</option><option>Vente personnelle</option></select></label><label class="field">Nature de la donnée<select name="type"><option value="asking">Prix demandé</option><option value="sold">Vente réalisée vérifiée</option></select></label><label class="field">Prix de la carte (€), hors frais<input name="amount" type="number" min="0.01" step="0.01" required></label><label class="field">Date de l’observation<input name="date" type="date" value="${today()}" max="${today()}" required></label><label class="field">Lien source HTTPS (ou référence personnelle)<input name="url" type="url" placeholder="https://…"></label><label class="field">Justification / référence de transaction<input name="note" maxlength="500" placeholder="Prix final constaté, référence…" required></label></div><label class="check-row"><input name="match" type="checkbox" required> Même référence, variante, langue et état (${esc(active.condition || "non défini")}). Pour une vente réalisée, je connais le montant final.</label><button class="secondary" type="submit" ${!active.identityConfirmed || !active.conditionConfirmed ? "disabled" : ""}>${icon("plus")} Ajouter ce comparable</button>${!active.identityConfirmed || !active.conditionConfirmed ? '<p class="muted">Confirmez d’abord l’identité et l’état.</p>' : ""}</form><div class="observations">${active.observations.map((o) => `<article><div><strong>${money(+o.amount)}</strong> · ${esc(o.source)}<small>${esc(TYPES[o.type])} · ${esc(o.date)} · ${esc(o.condition)}</small><small>${esc(o.note)}</small>${safeUrl(o.url) ? `<a href="${esc(safeUrl(o.url))}" target="_blank" rel="noopener noreferrer">Voir la source ↗</a>` : ""}</div>${btn("×", "remove-observation", "icon-button", `data-id="${o.id}" aria-label="Supprimer ce comparable"`)}</article>`).join("")}</div><hr><div class="estimate-box"><span class="eyebrow">ESTIMATION SELON L’ÉTAT</span><h3>${e.available ? `${money(e.low)} — ${money(e.high)}` : "Données insuffisantes"}</h3><p>${e.available ? `${e.count} comparables · ${esc(e.source)} · ${esc(TYPES[e.type])} · confiance ${e.confidence.toLowerCase()}. ${e.excluded} référence(s) non retenue(s).` : esc(e.reason)}</p></div><div class="form-grid">${select(
    "Stratégie de prix",
    "strategy",
    active.strategy,
    [
      ["fast", "Vente rapide"],
      ["balanced", "Prix équilibré"],
      ["high", "Prix haut"],
    ],
  )}${input("Prix de mise en vente choisi (€)", "price", active.price, "number", 'min="0.01" step="0.01"')}</div>${e.available ? btn(`Utiliser le prix conseillé : ${money(e.price)}`, "apply-price", "secondary") : ""}<p class="muted">Vous pouvez saisir votre propre prix. Les indicateurs ne garantissent pas une vente.</p></div>`;
}
function vintedInstallationView() {
  return `<details id="vinted-install"><summary>Activer le remplissage Vinted (une seule fois)</summary><p>Sur cet ordinateur, installez le compagnon dans Chrome ou Edge.</p><ol><li>${btn("Télécharger l’extension Chrome / Edge", "vinted-extension-download", "secondary")} puis décompressez le ZIP.</li><li>Ouvrez <strong>chrome://extensions</strong> (ou <strong>edge://extensions</strong>) et activez le mode développeur.</li><li>Cliquez sur « Charger l’extension non empaquetée » et sélectionnez le dossier <strong>poke-scan-sell-vinted</strong>.</li><li>Rechargez cette application. Le bouton « Remplir mon annonce sur Vinted » enverra ensuite les informations et les photos.</li></ol><p class="muted">Le compagnon téléchargé est associé à l’adresse de cette application. Les photos transitent dans ce navigateur avant leur envoi à Vinted. Votre connexion se fait directement sur Vinted.</p></details>`;
}
function vintedTransferView(errors) {
  return `<div class="transfer"><h3>Remplir votre annonce Vinted</h3><p>Envoyez le titre, la description, le prix et vos photos originales en un clic. La catégorie et l’état sont sélectionnés lorsqu’ils sont reconnus dans le formulaire.</p><p id="vinted-connection-status" class="muted">${vintedHelper ? "Compagnon Vinted connecté." : "Activez le compagnon Chrome / Edge une seule fois pour utiliser le remplissage."}</p><div class="actions">${btn(icon("arrow") + " Remplir mon annonce sur Vinted", "vinted-fill", "primary", errors.length ? "disabled" : "")}${btn(icon("download") + " Télécharger le dossier ZIP", "listing-zip", "secondary", errors.length ? "disabled" : "")}</div><p id="vinted-transfer-status" role="status">${esc(active.vintedTransferMessage || "Vérifiez les photos et les champs demandés sur Vinted, puis publiez votre annonce.")}</p>${vintedInstallationView()}<details><summary>Ouvrir Vinted pour un transfert manuel</summary><a class="button secondary" href="https://www.vinted.fr/items/new" target="_blank" rel="noopener noreferrer">Ouvrir Vinted ↗</a><p>Le titre et la description peuvent aussi être copiés avec les boutons ci-dessus ; le ZIP contient vos photos.</p></details></div>`;
}
function listingView(compact = false) {
  compact = compact === true;
  const errors = readyErrors(active);
  const stale =
    active.title && active.listingFingerprint !== listingFingerprint(active);
  if (stale)
    errors.push(
      "La carte a été modifiée : régénérez et relisez le texte de l’annonce.",
    );
  const generationErrors = readyErrors(active);
  return `<div class="panel"><div class="eyebrow">${compact ? "VOTRE ANNONCE" : "ÉTAPE 05"}</div><h2>Votre annonce, prête à être relue.</h2><p>Relisez votre annonce, puis envoyez-la au formulaire Vinted avec vos photos.</p><p class="muted">Sur Vinted, vérifiez la catégorie cartes à collectionner, les attributs obligatoires et le format du colis emballé.</p>${errors.length ? `<div class="notice amber"><strong>Avant de préparer l’annonce</strong><ul>${errors.map((e) => `<li>${e}</li>`).join("")}</ul></div>` : ""}${compact ? "" : btn(active.title ? "Régénérer le texte" : "Générer l’annonce", "generate", "primary", generationErrors.length ? "disabled" : "")}${active.title ? `<div class="listing-fields">${input("Titre de l’annonce", "title", active.title)}<label class="field">Description<textarea data-field="description" rows="10">${esc(active.description)}</textarea></label><div class="actions">${btn("Copier le titre", "copy-title", "secondary")}${btn("Copier la description", "copy-description", "secondary")}</div>${vintedTransferView(errors)}${input("Lien de votre annonce publiée", "listingUrl", active.listingUrl, "url", 'placeholder="https://www.vinted.fr/items/…"')}<div class="actions">${btn("Confirmer la publication manuellement", "published", "secondary", errors.length ? "disabled" : "")}${btn("Marquer comme vendue", "sold", "text-button", active.status !== "Publiée" ? "disabled" : "")}</div><p class="muted">Le statut est déclaré par vous ; aucune vérification automatique de Vinted n’est effectuée.</p></div>` : ""}<details><summary>Historique de cet exemplaire</summary>${
    active.history
      .slice()
      .reverse()
      .map(
        (h) =>
          `<p class="muted">${esc(new Date(h.at).toLocaleString("fr-FR"))} — ${esc(h.action)}</p>`,
      )
      .join("") || "<p>Aucune action enregistrée.</p>"
  }</details><hr><div class="actions">${btn("Archiver la carte", "archive", "secondary")}${btn("Supprimer cet exemplaire", "delete", "danger")}</div></div>`;
}
function render() {
  if (view === "editor") renderEditor();
  else if (view === "inventory") renderInventory();
  else if (view === "settings") renderSettings();
  else renderDashboard();
}
async function runJob(message, task) {
  if (busy) return;
  busy = true;
  toast(message);
  app.setAttribute("aria-busy", "true");
  try {
    await task();
  } catch (e) {
    toast(e.message || "Une erreur est survenue.", true);
  } finally {
    busy = false;
    app.removeAttribute("aria-busy");
  }
}
function clearIdentity() {
  active.identityConfirmed = false;
  active.conditionConfirmed = false;
  active.catalogId = "";
  active.market = null;
  active.variantOptions = [];
  invalidateListing();
}
function invalidateListing() {
  delete active.vintedTransferId;
  delete active.vintedTransferMessage;
  if (!["Vendue", "Archivée"].includes(active.status))
    active.status = "À vérifier";
}
async function applyCatalog(id, loaded = null, readNumber = "") {
  const result = loaded || (await getCard(id, active.language));
  active.catalogId = result.id;
  active.name = result.name;
  active.number =
    readNumber ||
    (result.set.cardCount.official > 0
      ? `${result.localId}/${result.set.cardCount.official}`
      : String(result.localId));
  active.set = result.set.name;
  active.variant = "";
  active.variantOptions = (result.variants_detailed || []).map((v) =>
    [v.type, v.subtype, ...(v.stamp || [])].filter(Boolean).join(" — "),
  );
  if (!active.variantOptions.length)
    active.variantOptions = Object.entries(result.variants || {})
      .filter(([, yes]) => yes)
      .map(([v]) => v);
  if (active.variantOptions.length === 1)
    active.variant = active.variantOptions[0];
  setMarket(result);
  active.identityConfirmed = false;
  invalidateListing();
  candidates = [];
  await persist();
  render();
  toast("Carte identifiée. Vérifiez le nom et le numéro de votre exemplaire.");
}
async function identifyFromEvidence(evidence) {
  const resolution = await resolveCatalogue(
    candidates,
    evidence,
    active.language,
    (message) => {
      const status = document.querySelector("#job-status");
      if (status) status.textContent = message;
    },
  );
  if (resolution.card)
    await applyCatalog(resolution.card.id, resolution.card, evidence.number);
  else if (resolution.identity) {
    active.name = resolution.identity.name;
    active.number = resolution.identity.number;
    active.set = "";
    active.variant = "";
    clearIdentity();
    candidates = [];
  }
  return resolution;
}
function setMarket(result) {
  const m = result.pricing?.cardmarket;
  active.market = m
    ? {
        trend: Number.isFinite(m.trend) && m.trend > 0 ? m.trend : null,
        updated: m.updated,
        source: "Cardmarket via TCGdex",
        fetchedAt: new Date().toISOString(),
      }
    : null;
}
app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  event.preventDefault();
  if (busy) {
    toast("Une opération est en cours. Patientez quelques instants.");
    return;
  }
  const action = target.dataset.action;
  await runJobQuiet(async () => {
    if (action === "vinted-extension-download") {
      await runJob("Préparation de l’extension…", downloadVintedExtension);
      return;
    }
    if (action === "vinted-fill") {
      await runJob("Connexion au compagnon Vinted…", async () => {
        makeVintedDraft(active);
        vintedHelper = await checkVintedHelper();
        if (!vintedHelper) {
          render();
          const instructions = document.querySelector("#vinted-install");
          instructions.open = true;
          instructions.scrollIntoView({ behavior: "smooth", block: "start" });
          toast(
            "Activez le compagnon une seule fois, puis rechargez l’application.",
          );
          return;
        }
        const transfer = await sendToVinted(active, (message) => {
          const status = document.querySelector("#vinted-transfer-status");
          if (status) status.textContent = message;
        });
        active.vintedTransferId = transfer.id;
        active.vintedTransferMessage =
          "Annonce envoyée au compagnon. Le remplissage reprend dès que le formulaire Vinted est accessible.";
        log("Annonce et photos transmises au compagnon Vinted");
        await persist();
        render();
      });
      return;
    }
    if (["dashboard", "inventory", "settings"].includes(action)) {
      view = action;
      render();
      return;
    }
    if (action === "new") {
      active = newCard();
      quickMode = true;
      quickMessage = "";
      cards.unshift(active);
      await persist();
      view = "editor";
      step = 0;
      candidates = [];
      render();
      return;
    }
    if (action === "edit") {
      active = cards.find((c) => c.id === target.dataset.id);
      quickMode = true;
      quickMessage = "";
      view = "editor";
      step = 0;
      candidates = [];
      render();
      return;
    }
    if (action === "step" || action === "next" || action === "previous") {
      step =
        action === "step"
          ? +target.dataset.step
          : step + (action === "next" ? 1 : -1);
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (action === "advanced-mode" || action === "quick-mode") {
      quickMode = action === "quick-mode";
      step = 0;
      render();
      return;
    }
    if (action === "quick-prepare") {
      const useAI = document.querySelector("#quick-ai").checked;
      candidates = [];
      await runJob("Préparation de votre carte…", () =>
        prepareQuickCard(useAI),
      );
      return;
    }
    if (action === "use-trend") {
      if (active.market?.trend > 0) {
        active.price = active.market.trend;
        invalidateListing();
        log("Tendance générale choisie comme point de départ par le vendeur");
        await persist();
        render();
      }
      return;
    }
    if (action === "quick-validate") {
      const proposed = {
        ...active,
        identityConfirmed: true,
        conditionConfirmed: true,
      };
      const errors = readyErrors(proposed);
      if (errors.length) throw new Error(errors.join(" "));
      if (
        active.title &&
        !confirm(
          "Actualiser le texte de l’annonce et remplacer vos corrections ?",
        )
      )
        return;
      active.identityConfirmed = true;
      active.conditionConfirmed = true;
      Object.assign(active, generateListing(active));
      active.listingFingerprint = listingFingerprint(active);
      active.status = "Prête";
      log("Carte vérifiée et annonce générée en mode rapide");
      await persist();
      render();
      document
        .querySelector(".listing-fields")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (action === "save-vision-access") {
      sessionStorage.setItem(
        "vision-access",
        document.querySelector("#vision-access").value,
      );
      document.querySelector("#vision-access").value = "";
      toast("Code enregistré pour cet onglet.");
      return;
    }
    if (action === "clear-vision-access") {
      sessionStorage.removeItem("vision-access");
      toast("Code effacé.");
      return;
    }
    if (action === "vision") {
      if (
        !confirm(
          "Envoyer les photos recto et verso à OpenAI via votre serveur pour analyser la carte ? Cet appel utilise votre quota API.",
        )
      )
        return;
      await runJob("Analyse des photos…", async () => {
        const result = await analyzePhotos(active);
        active.aiAnalysis = result;
        active.conditionConfirmed = false;
        if (result.photosSufficient && result.condition !== "unknown") {
          active.condition = result.condition;
          active.defectNotes = result.defects.join("; ");
        }
        if (!active.name && result.name) active.name = result.name;
        if (!active.number && result.number) active.number = result.number;
        active.identityConfirmed = false;
        invalidateListing();
        log("Proposition IA reçue, à vérifier manuellement");
        await persist();
        render();
        toast("Analyse terminée. Vérifiez la proposition avant confirmation.");
      });
      return;
    }
    if (action === "export") {
      download(
        new Blob(
          [
            JSON.stringify(
              { schema: 1, exportedAt: new Date().toISOString(), cards },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
        `poke-scan-sell-${today()}.json`,
      );
      toast("Sauvegarde téléchargée. Conservez-la dans un endroit sûr.");
      return;
    }
    if (action === "remove-photo") {
      active.photos = active.photos.filter((p) => p.id !== target.dataset.id);
      active.aiAnalysis = null;
      active.conditionConfirmed = false;
      active.identityConfirmed = false;
      invalidateListing();
      await persist();
      render();
      return;
    }
    if (action === "search") {
      await runJob("Recherche dans le catalogue…", async () => {
        candidates = await searchCards(
          active.name,
          active.number,
          active.language,
        );
        render();
        toast(
          candidates.length
            ? `${candidates.length} référence(s). Vérifiez l’extension et la variante.`
            : "Aucune correspondance. Corrigez le nom/numéro ou utilisez la saisie manuelle.",
        );
      });
      return;
    }
    if (action === "candidate") {
      await runJob("Chargement de la référence…", () =>
        applyCatalog(target.dataset.id),
      );
      return;
    }
    if (action === "ocr") {
      await runJob(
        "Lecture de la photo… Le premier chargement peut prendre une minute.",
        async () => {
          const result = await recognizePhoto(
            active.photos.find((p) => p.side === "front").data,
            active.language,
            (p) => {
              const status = document.querySelector("#job-status");
              if (status) status.textContent = `Lecture du texte : ${p} %`;
            },
          );
          active.ocrText = result.text;
          active.scanDiagnostics = result.diagnostics;
          active.name = result.name;
          active.number = result.number;
          active.set = "";
          active.variant = "";
          candidates = result.matches;
          active.identityConfirmed = false;
          clearIdentity();
          const resolution = await identifyFromEvidence({
            number: result.number,
            name: result.name,
            text: result.text,
          });
          quickMessage = resolution.reason;
          await persist();
          render();
          toast(result.warning || resolution.reason);
        },
      );
      return;
    }
    if (action === "refresh-market") {
      await runJob("Actualisation de la source…", async () => {
        setMarket(
          await getCard(active.catalogId, active.language, { refresh: true }),
        );
        await persist();
        render();
        toast("Données catalogue actualisées.");
      });
      return;
    }
    if (action === "remove-observation") {
      active.observations = active.observations.filter(
        (o) => o.id !== target.dataset.id,
      );
      await persist();
      render();
      return;
    }
    if (action === "apply-price") {
      const e = estimate(active);
      if (e.available) {
        active.price = e.price;
        active.lastEstimate = { ...e, at: new Date().toISOString() };
        active.status = "Estimée";
        log("Prix proposé appliqué");
        await persist();
        render();
      }
      return;
    }
    if (action === "generate") {
      if (readyErrors(active).length)
        throw new Error("Complétez les informations avant de générer.");
      if (
        active.title &&
        !confirm(
          "Remplacer le titre et la description, y compris vos corrections ?",
        )
      )
        return;
      Object.assign(active, generateListing(active));
      active.listingFingerprint = listingFingerprint(active);
      active.status = "Prête";
      log("Annonce générée et prête à transférer");
      await persist();
      render();
      return;
    }
    if (action === "copy-title" || action === "copy-description") {
      await navigator.clipboard.writeText(
        action === "copy-title" ? active.title : active.description,
      );
      toast("Texte copié.");
      return;
    }
    if (action === "listing-zip") {
      if (
        readyErrors(active).length ||
        active.listingFingerprint !== listingFingerprint(active)
      )
        throw new Error("Régénérez l’annonce après modification de la carte.");
      await runJob("Préparation du dossier…", async () => {
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        zip.file(
          "annonce.txt",
          `${active.title}\n\n${active.description}\n\nPrix : ${money(+active.price)}\nPublication manuelle : vérifiez catégorie, attributs et colis sur Vinted.`,
        );
        active.photos.forEach((p, i) =>
          zip.file(
            `${i + 1}-${p.side}.${p.type === "image/jpeg" ? "jpg" : p.type === "image/webp" ? "webp" : "png"}`,
            p.data.split(",")[1],
            { base64: true },
          ),
        );
        download(
          await zip.generateAsync({ type: "blob" }),
          `annonce-${active.id.slice(0, 8)}.zip`,
        );
        toast("Photos originales et annonce téléchargées.");
      });
      return;
    }
    if (action === "published") {
      const url = safeUrl(active.listingUrl, "vinted.fr");
      if (!url || !new URL(url).pathname.startsWith("/items/"))
        throw new Error(
          "Renseignez un lien d’annonce https://www.vinted.fr/items/…",
        );
      if (
        readyErrors(active).length ||
        active.listingFingerprint !== listingFingerprint(active)
      )
        throw new Error("Complétez les informations puis régénérez l’annonce.");
      active.listingUrl = url;
      active.status = "Publiée";
      log("Publication déclarée manuellement par le vendeur (non vérifiée)");
      await persist();
      render();
      return;
    }
    if (action === "sold") {
      active.status = "Vendue";
      log("Vente déclarée manuellement");
      await persist();
      render();
      return;
    }
    if (action === "archive") {
      active.status = "Archivée";
      log("Carte archivée");
      await persist();
      view = "inventory";
      render();
      return;
    }
    if (action === "delete") {
      if (
        !confirm(
          "Supprimer définitivement cet exemplaire et ses photos locales ? Exportez une sauvegarde si nécessaire.",
        )
      )
        return;
      await deleteCard(active.id);
      cards = cards.filter((c) => c.id !== active.id);
      active = null;
      view = "inventory";
      render();
      toast("Exemplaire supprimé.");
      return;
    }
  });
});
async function runJobQuiet(task) {
  try {
    await task();
  } catch (e) {
    toast(
      e.message ||
        "Opération impossible. Vos dernières modifications peuvent ne pas être sauvegardées.",
      true,
    );
  }
}
app.addEventListener("change", (event) =>
  runJobQuiet(async () => {
    const el = event.target;
    if (el.classList.contains("photo-input")) {
      if (!el.files[0]) return;
      await runJob("Enregistrement de la photo…", async () => {
        const side = el.dataset.side;
        if (
          active.photos.length >= 6 &&
          (side === "detail" || !active.photos.some((p) => p.side === side))
        )
          throw new Error("Maximum 6 photos par carte.");
        const photo = await readPhoto(el.files[0], side);
        if (side !== "detail")
          active.photos = active.photos.filter((p) => p.side !== side);
        active.photos.push(photo);
        active.aiAnalysis = null;
        active.conditionConfirmed = false;
        active.identityConfirmed = false;
        invalidateListing();
        await persist();
        render();
        toast("Photo enregistrée.");
      });
      return;
    }
    if (el.id === "restore") {
      const file = el.files[0];
      if (!file) return;
      if (file.size > 50 * 1024 * 1024)
        throw new Error("Sauvegarde trop volumineuse (maximum 50 Mo).");
      const parsed = JSON.parse(await file.text());
      const restored = validateBackup(parsed);
      await importCards(restored);
      cards = await listCards();
      render();
      toast(
        `${restored.length} carte(s) restaurée(s), sans écraser les existantes.`,
      );
      return;
    }
    if (el.id === "status-filter") {
      statusFilter = el.value;
      renderInventory();
      return;
    }
    if (el.id === "catalog-variant") {
      active.variant = el.value;
      active.identityConfirmed = false;
      invalidateListing();
      await persist();
      render();
      return;
    }
    if (el.dataset.defect) {
      active.defects = el.checked
        ? [...active.defects, el.dataset.defect]
        : active.defects.filter((d) => d !== el.dataset.defect);
      active.conditionConfirmed = false;
      invalidateListing();
      await persist();
      render();
      return;
    }
    if (el.dataset.field) {
      const f = el.dataset.field;
      active[f] = el.type === "checkbox" ? el.checked : el.value;
      if (["title", "description"].includes(f)) {
        delete active.vintedTransferId;
        delete active.vintedTransferMessage;
      }
      if (["name", "number", "set", "language"].includes(f)) clearIdentity();
      if (f === "variant") {
        active.identityConfirmed = false;
        invalidateListing();
      }
      if (["condition", "defectNotes"].includes(f)) {
        active.conditionConfirmed = false;
        invalidateListing();
      }
      if (["price", "identityConfirmed", "conditionConfirmed"].includes(f))
        invalidateListing();
      if (
        f === "identityConfirmed" &&
        el.checked &&
        (!active.name.trim() || !active.number.trim())
      ) {
        active.identityConfirmed = false;
        throw new Error("Renseignez le nom et le numéro de la carte.");
      }
      await persist();
      if (
        [
          ...(quickMode
            ? ["price", "variant", "name", "number", "set", "defectNotes"]
            : []),
          "strategy",
          "condition",
          "identityConfirmed",
          "conditionConfirmed",
        ].includes(f)
      )
        render();
    }
  }),
);
app.addEventListener("input", (event) => {
  if (event.target.id === "inventory-search") {
    query = event.target.value;
    document.querySelector("#collection-results").innerHTML = collectionGrid(
      cards.filter(
        (c) =>
          (statusFilter === "all" || c.status === statusFilter) &&
          `${c.name} ${c.number} ${c.set}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    );
  }
});
app.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id !== "observation-form") return;
  runJobQuiet(async () => {
    const f = new FormData(event.target);
    if (!active.identityConfirmed || !active.conditionConfirmed)
      throw new Error("Confirmez la carte et son état.");
    if (!Number.isFinite(+f.get("amount")) || +f.get("amount") <= 0)
      throw new Error("Prix invalide.");
    if (f.get("url") && !safeUrl(f.get("url")))
      throw new Error("Le lien source doit utiliser HTTPS.");
    active.observations.push({
      id: crypto.randomUUID(),
      source: f.get("source"),
      type: f.get("type"),
      amount: +f.get("amount"),
      currency: "EUR",
      date: f.get("date"),
      url: f.get("url"),
      note: f.get("note"),
      matchConfirmed: true,
      cardKey: cardKey(active),
      condition: active.condition,
    });
    await persist();
    render();
    toast("Comparable ajouté.");
  });
});
function validateBackup(data) {
  if (
    data.schema !== 1 ||
    !Array.isArray(data.cards) ||
    data.cards.length > 500
  )
    throw new Error("Sauvegarde non reconnue (version 1, maximum 500 cartes).");
  return data.cards.map((raw) => {
    const c = newCard();
    for (const key of [
      "name",
      "number",
      "set",
      "language",
      "variant",
      "condition",
      "defectNotes",
      "title",
      "description",
      "listingUrl",
      "catalogId",
    ])
      if (typeof raw[key] === "string") c[key] = raw[key].slice(0, 20000);
    if (!["fr", "en"].includes(c.language)) c.language = "fr";
    c.price = Number.isFinite(+raw.price) && +raw.price >= 0 ? raw.price : "";
    c.strategy = ["fast", "balanced", "high"].includes(raw.strategy)
      ? raw.strategy
      : "balanced";
    c.status = STATUSES.includes(raw.status) ? raw.status : "À vérifier";
    c.identityConfirmed = raw.identityConfirmed === true;
    c.conditionConfirmed = raw.conditionConfirmed === true;
    c.defects = Array.isArray(raw.defects)
      ? raw.defects.filter((x) => typeof x === "string").slice(0, 20)
      : [];
    c.photos = (Array.isArray(raw.photos) ? raw.photos : [])
      .slice(0, 6)
      .map((p) => {
        if (
          typeof p.data !== "string" ||
          p.data.length > 14000000 ||
          !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.data)
        )
          throw new Error("Une photo de la sauvegarde est invalide.");
        return {
          id: crypto.randomUUID(),
          data: p.data,
          side: ["front", "back", "detail"].includes(p.side)
            ? p.side
            : "detail",
          name: "photo-restauree",
          type: p.data.slice(5, p.data.indexOf(";")),
          warnings: [],
        };
      });
    c.observations = (Array.isArray(raw.observations) ? raw.observations : [])
      .slice(0, 500)
      .filter((o) => Number.isFinite(+o.amount) && +o.amount > 0)
      .map((o) => ({
        id: crypto.randomUUID(),
        source: String(o.source || "").slice(0, 100),
        type: ["asking", "sold", "aggregate"].includes(o.type)
          ? o.type
          : "aggregate",
        amount: +o.amount,
        currency: "EUR",
        date: String(o.date || ""),
        url: safeUrl(o.url) || "",
        note: String(o.note || "").slice(0, 500),
        matchConfirmed: o.matchConfirmed === true,
        cardKey: String(o.cardKey || ""),
        condition: String(o.condition || ""),
      }));
    if (c.title) c.listingFingerprint = listingFingerprint(c);
    if (
      !c.photos.some((p) => p.side === "front") ||
      !c.photos.some((p) => p.side === "back")
    )
      c.conditionConfirmed = false;
    c.history = [
      {
        at: new Date().toISOString(),
        action:
          "Exemplaire restauré depuis une sauvegarde, sous un nouvel identifiant",
      },
    ];
    return c;
  });
}
try {
  cards = (await listCards()).map(migrateCard);
  cards.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  render();
} catch {
  app.innerHTML =
    '<main class="fatal"><h1>Le stockage local est indisponible.</h1><p>Autorisez les données de ce site dans votre navigateur pour conserver vos cartes.</p></main>';
}
async function refreshVintedConnection() {
  vintedHelper = await checkVintedHelper();
  const connection = document.querySelector("#vinted-connection-status");
  if (connection)
    connection.textContent = vintedHelper
      ? "Compagnon Vinted connecté."
      : "Activez le compagnon Chrome / Edge une seule fois pour utiliser le remplissage.";
  if (!vintedHelper || !active?.vintedTransferId) return;
  const card = active;
  try {
    const receipt = await getVintedStatus(card.vintedTransferId);
    if (active !== card) return;
    if (receipt.status === "filled")
      card.vintedTransferMessage =
        "Titre, description et prix remplis ; photos transmises au formulaire. Vérifiez le résultat et les champs restants sur Vinted avant de publier.";
    else if (["partial", "blocked"].includes(receipt.status))
      card.vintedTransferMessage =
        "Le remplissage demande votre attention. Consultez le message Poke Scan Sell dans l’onglet Vinted pour reprendre ou compléter les champs.";
    const status = document.querySelector("#vinted-transfer-status");
    if (status) status.textContent = card.vintedTransferMessage;
  } catch {
    // A closed or expired transfer can be sent again from the current draft.
  }
}
window.addEventListener("focus", refreshVintedConnection);
refreshVintedConnection();
