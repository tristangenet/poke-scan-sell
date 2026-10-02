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
import {
  cardStage,
  filterCards,
  reviewIssues,
  listingReady,
  cardmarketSearchUrl,
} from "./ui-state.js";
import { quickView } from "./quick-view.js";
import {
  icon,
  esc,
  badge,
  btn,
  input,
  select,
  cardVisual,
  scanGuide,
  collectionGrid,
  layout,
  dashboardView,
  inventoryView,
  settingsView,
  helpView,
} from "./interface.js";
const app = document.querySelector("#app");
let cards = [],
  active = null,
  view = "dashboard",
  step = 0,
  quickMode = true,
  quickStage = "photos",
  reviewErrors = {},
  quickMessage = "",
  candidates = [],
  busy = false,
  query = "",
  statusFilter = "all",
  inventorySort = "recent";
let previewSide = "front";
let fieldSaveTimer = null;
let pendingSaves = 0;
let saveStatusMessage = "Sur cet appareil";
let saveStatusError = false;
let vintedHelper = { connected: false, ready: false, version: "" };
const steps = ["Photos", "Identification", "État", "Estimation", "Annonce"];
function toast(message, error = false) {
  const t = document.querySelector("#toast");
  t.textContent = message;
  t.className = error ? "show error" : "show";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = ""), 6000);
}
async function persist() {
  if (!active) return;
  const card = active;
  card.updatedAt = new Date().toISOString();
  pendingSaves++;
  setSaveStatus("Enregistrement…");
  try {
    await saveCard(card);
  } catch (error) {
    setSaveStatus("Sauvegarde impossible", true);
    throw error;
  } finally {
    pendingSaves--;
  }
  const i = cards.findIndex((c) => c.id === card.id);
  if (i < 0) cards.unshift(card);
  else cards[i] = card;
  setSaveStatus(
    pendingSaves || fieldSaveTimer
      ? "Enregistrement…"
      : "Enregistré sur cet appareil",
  );
}
function setSaveStatus(message, error = false) {
  saveStatusMessage = message;
  saveStatusError = error;
  const status = document.querySelector("#save-status");
  if (status) {
    status.textContent = message;
    status.classList.toggle("save-error", error);
  }
}
function log(action) {
  active.history.push({ at: new Date().toISOString(), action });
}
function shell(content) {
  app.innerHTML = layout(content, {
    view,
    version: packageInfo.version,
    stage: quickStage,
    collectionCount: cards.length,
  });
  setSaveStatus(saveStatusMessage, saveStatusError);
}
function renderDashboard() {
  shell(dashboardView(cards));
}
function inventoryCards() {
  return filterCards(cards, {
    query,
    group: statusFilter,
    sort: inventorySort,
  });
}
function renderInventory() {
  shell(
    inventoryView(cards, inventoryCards(), {
      query,
      statusFilter,
      sort: inventorySort,
    }),
  );
}
function renderSettings() {
  let backupDate = "";
  try {
    const date = localStorage.getItem("poke-scan-sell:last-backup");
    if (date)
      backupDate = new Date(date).toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      });
  } catch {
    /* Backup export remains available if preferences are blocked. */
  }
  shell(
    settingsView({
      cards,
      connection: vintedConnectionText(),
      installation: vintedInstallationView(),
      backupDate,
    }),
  );
}
function renderHelp() {
  shell(helpView(vintedInstallationView()));
}
function renderEditor() {
  if (!active) return;
  if (quickMode) return renderQuickEditor();
  const e = estimate(active);
  shell(
    `<div class="editor-heading"><div><div class="eyebrow">${esc(active.name || "NOUVEL EXEMPLAIRE")}</div><h1>Préparons votre annonce.</h1>${btn("Revenir au parcours guidé", "quick-mode", "text-button")}</div><div class="saved"><span class="dot"></span> Sauvegarde locale ${badge(active.status)}</div></div><div class="steps" role="navigation" aria-label="Étapes de préparation">${steps.map((s, i) => `<button data-action="step" data-step="${i}" class="step ${i === step ? "current" : ""}"><span>${i + 1}</span>${s}</button>`).join("")}</div><div class="editor-layout"><section class="editor-main">${[photosView, identityView, conditionView, priceView, listingView][step](e)}<div class="step-footer">${btn(step ? "← Étape précédente" : "← Ma collection", step ? "previous" : "inventory", "secondary")}${step < 4 ? btn("Continuer " + icon("arrow"), "next") : ""}</div></section><aside class="summary panel"><span class="eyebrow">VOTRE EXEMPLAIRE</span><div class="summary-image">${cardVisual(active)}</div><h3>${esc(active.name || "Carte à identifier")}</h3><p>${esc(active.set || "Extension non précisée")}<br>${esc(active.number || "Numéro à renseigner")} · ${esc(active.language.toUpperCase())}</p><div class="summary-line"><span>Variante</span><strong>${esc(active.variant || "Non précisée")}</strong></div><div class="summary-line"><span>État</span><strong>${esc(active.condition || "À vérifier")}</strong></div><div class="summary-line"><span>Prix choisi</span><strong>${+active.price > 0 ? money(+active.price) : "—"}</strong></div><p class="muted">Un exemplaire unique.<br>Vos modifications sont enregistrées à chaque changement de champ.</p></aside></div>`,
  );
}
function renderQuickEditor() {
  shell(
    quickView({
      card: active,
      stage: quickStage,
      photos: quickStage === "photos" ? photosView() : "",
      listing: quickStage === "listing" ? listingView(true) : "",
      e: estimate(active),
      message: quickMessage,
      errors: reviewErrors,
      previewSide,
    }),
  );
}
function focusStage() {
  const heading =
    document.querySelector("#stage-title") || document.querySelector("main h1");
  heading?.setAttribute("tabindex", "-1");
  heading?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
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
  quickStage = "review";
  render();
  toast(
    active.name && active.number
      ? "Carte préparée. Vérifiez les informations lues."
      : quickMessage,
    !active.name || !active.number,
  );
}
function photosView() {
  return `<section class="panel capture-panel"><div class="section-intro"><span class="panel-icon">${icon("camera")}</span><div><h2 id="stage-title" tabindex="-1">Deux photos. Une annonce.</h2><p>Cadrez toute la carte, avec une lumière douce et sans reflet.</p></div><span class="capture-progress"><strong>${["front", "back"].filter((side) => active.photos.some((p) => p.side === side)).length}</strong> / 2 photos</span></div><div class="photo-grid">${[
    "front",
    "back",
  ]
    .map((side) => {
      const p = active.photos.find((p) => p.side === side);
      const label = side === "front" ? "recto" : "verso";
      return `<div class="photo-slot ${p ? "has-photo" : ""}" data-side="${side}"><div class="photo-slot-label"><span>${side === "front" ? "1" : "2"}</span><strong>${side === "front" ? "Le recto" : "Le verso"}</strong>${p ? `<span class="photo-done">${icon("check")} Ajouté</span>` : ""}</div>${p ? `<img src="${esc(p.data)}" alt="${side === "front" ? "Recto" : "Verso"} de la carte"><button type="button" class="remove-photo" data-action="remove-photo" data-id="${p.id}" aria-label="Supprimer la photo ${label}">×</button>` : `<div class="photo-guide">${scanGuide(side)}<p>${side === "front" ? "Le nom et le numéro doivent être lisibles." : "Gardez les coins et les bords visibles."}</p></div>`}<label class="button secondary upload-control">${icon(p ? "edit" : "plus")}${p ? " Remplacer" : " Ajouter une photo"}<input class="photo-input sr-only" type="file" data-side="${side}" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Ajouter ou remplacer le ${label}"></label><small class="drop-hint">${p ? "" : "ou déposez une image ici"}</small></div>`;
    })
    .join(
      "",
    )}</div><details class="photo-extras"><summary>Ajouter des détails ou consulter les conseils photo</summary><p>Montrez les défauts dans les photos de détail : un coin usé, une rayure ou une pliure.</p><label class="button secondary upload-control">${icon("plus")} Ajouter un détail<input class="photo-input sr-only" type="file" data-side="detail" accept="image/jpeg,image/png,image/webp" aria-label="Ajouter une photo de détail"></label><p class="muted">JPEG, PNG ou WebP. Jusqu’à 6 photos de 10 Mo chacune.</p></details><div class="detail-photos">${active.photos
    .filter((p) => p.side === "detail")
    .map(
      (p) =>
        `<div><img src="${esc(p.data)}" alt="Détail de la carte"><button type="button" data-action="remove-photo" data-id="${p.id}" aria-label="Supprimer ce détail">×</button></div>`,
    )
    .join("")}</div>${active.photos
    .flatMap((p) => p.warnings || [])
    .map((w) => `<p class="notice amber">${esc(w)}</p>`)
    .join(
      "",
    )}<div class="photo-privacy">${icon("shield")} Vos photos originales sont conservées, avec les défauts visibles.</div></section>`;
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
  return `<div class="panel"><div class="eyebrow">ÉTAPE 04</div><h2>Un prix fondé sur des références.</h2><p>Un prix affiché n’est pas forcément un prix de vente réalisé. Gardez des comparables de la même carte, variante, langue et état.</p>${m ? `<div class="market"><div><span class="eyebrow">CARDMARKET VIA TCGDEX</span><h3>Tendance générale ${Number.isFinite(m.trend) ? money(m.trend) : "non disponible"}</h3><small>Mise à jour source : ${esc(m.updated || "inconnue")}</small></div>${badge("Agrégat")}</div><p class="notice amber">Indicateur général de la référence catalogue, non filtré par état/langue et variante exacte non garantie. Il ne constitue pas votre estimation et n’est pas appliqué automatiquement.</p>` : `<p class="notice">${active.catalogId ? "Aucune tendance exploitable retournée pour cette référence." : "Choisissez une référence catalogue pour consulter une tendance si elle est disponible."}</p>`}<div class="actions">${btn("Actualiser les données catalogue", "refresh-market", "secondary", !active.catalogId ? "disabled" : "")}<a class="button secondary" href="https://www.vinted.fr/catalog?search_text=${encodeURIComponent([active.name, active.number, active.set, active.variant].join(" "))}" target="_blank" rel="noopener noreferrer">Rechercher sur Vinted ↗</a><a class="button secondary" href="${esc(cardmarketSearchUrl(active))}" target="_blank" rel="noopener noreferrer">Rechercher sur Cardmarket ↗</a></div><hr><h3>Vos comparables vérifiés</h3><form id="observation-form"><div class="form-grid"><label class="field">Source<select name="source"><option>Vinted</option><option>Cardmarket</option><option>Vente personnelle</option></select></label><label class="field">Nature de la donnée<select name="type"><option value="asking">Prix demandé</option><option value="sold">Vente réalisée vérifiée</option></select></label><label class="field">Prix de la carte (€), hors frais<input name="amount" type="number" min="0.01" step="0.01" required></label><label class="field">Date de l’observation<input name="date" type="date" value="${today()}" max="${today()}" required></label><label class="field">Lien source HTTPS (ou référence personnelle)<input name="url" type="url" placeholder="https://…"></label><label class="field">Justification / référence de transaction<input name="note" maxlength="500" placeholder="Prix final constaté, référence…" required></label></div><label class="check-row"><input name="match" type="checkbox" required> Même référence, variante, langue et état (${esc(active.condition || "non défini")}). Pour une vente réalisée, je connais le montant final.</label><button class="secondary" type="submit" ${!active.identityConfirmed || !active.conditionConfirmed ? "disabled" : ""}>${icon("plus")} Ajouter ce comparable</button>${!active.identityConfirmed || !active.conditionConfirmed ? '<p class="muted">Confirmez d’abord l’identité et l’état.</p>' : ""}</form><div class="observations">${active.observations.map((o) => `<article><div><strong>${money(+o.amount)}</strong> · ${esc(o.source)}<small>${esc(TYPES[o.type])} · ${esc(o.date)} · ${esc(o.condition)}</small><small>${esc(o.note)}</small>${safeUrl(o.url) ? `<a href="${esc(safeUrl(o.url))}" target="_blank" rel="noopener noreferrer">Voir la source ↗</a>` : ""}</div>${btn("×", "remove-observation", "icon-button", `data-id="${o.id}" aria-label="Supprimer ce comparable"`)}</article>`).join("")}</div><hr><div class="estimate-box"><span class="eyebrow">ESTIMATION SELON L’ÉTAT</span><h3>${e.available ? `${money(e.low)} — ${money(e.high)}` : "Données insuffisantes"}</h3><p>${e.available ? `${e.count} comparables · ${esc(e.source)} · ${esc(TYPES[e.type])} · confiance ${e.confidence.toLowerCase()}. ${e.excluded} référence(s) non retenue(s).` : esc(e.reason)}</p></div><div class="form-grid">${select(
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
  return `<details id="vinted-install"><summary>${vintedHelper.connected && !vintedHelper.ready ? "Mettre à jour le compagnon Vinted" : "Activer le remplissage Vinted (une seule fois)"}</summary><p>Sur cet ordinateur, utilisez le compagnon dans Chrome ou Edge.</p><ol><li>${btn("Télécharger l’extension Chrome / Edge", "vinted-extension-download", "secondary")} puis décompressez le ZIP.</li><li>Si l’extension est déjà installée, remplacez les fichiers du dossier déjà chargé avec ceux du ZIP. Dans <strong>chrome://extensions</strong> (ou <strong>edge://extensions</strong>), cliquez sur la flèche circulaire « Recharger » de Poke Scan Sell — Vinted.</li><li>Pour une première installation, activez le mode développeur, cliquez sur « Charger l’extension non empaquetée » et sélectionnez le dossier <strong>poke-scan-sell-vinted</strong>.</li><li>Rechargez les onglets de cette application et de Vinted, puis relancez « Remplir mon annonce sur Vinted ».</li></ol><p class="muted">Le compagnon téléchargé est associé à l’adresse de cette application. Les photos transitent dans ce navigateur avant leur envoi à Vinted. Votre connexion se fait directement sur Vinted.</p></details>`;
}
function vintedConnectionText() {
  if (!vintedHelper.connected)
    return "Activez le compagnon Chrome / Edge une seule fois pour utiliser le remplissage.";
  if (!vintedHelper.ready)
    return `Compagnon Vinted v${vintedHelper.version} : mise à jour nécessaire. Téléchargez la nouvelle extension et rechargez-la dans Chrome / Edge.`;
  return `Compagnon Vinted connecté · v${vintedHelper.version}.`;
}
function vintedTransferView(errors) {
  return `<div class="transfer"><div class="transfer-heading"><span class="transfer-icon">${icon("external")}</span><div><h3>Envoyer l’annonce sur Vinted</h3><p>Les photos, le texte, le prix et l’état sont préremplis dans le formulaire.</p></div></div><p id="vinted-connection-status" class="connection-status">${esc(vintedConnectionText())}</p><div class="actions">${btn(icon("arrow") + " Remplir mon annonce sur Vinted", "vinted-fill", "primary", errors.length ? "disabled" : "")}</div><p id="vinted-transfer-status" role="status" aria-live="polite">${esc(active.vintedTransferMessage || "Relisez le formulaire et les photos dans Vinted avant de cliquer sur Publier.")}</p>${vintedInstallationView()}</div>`;
}
function listingView(compact = false) {
  compact = compact === true;
  const errors = readyErrors(active);
  if (active.listingFingerprint !== listingFingerprint(active) && active.title)
    errors.push(
      "La carte a changé. Vérifiez les informations et actualisez l’annonce.",
    );
  if (
    (active.title || compact) &&
    (!active.title?.trim() || !active.description?.trim())
  )
    errors.push("Renseignez un titre et une description pour votre annonce.");
  const generationErrors = readyErrors(active);
  const hasListing = active.title || active.listingFingerprint;
  const fields = `${input("Titre de l’annonce", "title", active.title, "text", 'maxlength="500"')}<label class="field">Description<textarea data-field="description" rows="8" maxlength="20000">${esc(active.description)}</textarea></label>`;
  return `<section class="panel listing-panel"><div class="eyebrow">${compact ? "APERÇU DE VOTRE ANNONCE" : "ÉTAPE 05"}</div><h2 id="stage-title" tabindex="-1">${compact ? "Votre annonce" : "Votre annonce, prête à être relue."}</h2>${errors.length ? `<div class="notice amber" role="alert"><strong>Avant d’envoyer l’annonce</strong><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul></div>` : ""}${compact ? "" : btn(active.title ? "Régénérer le texte" : "Générer l’annonce", "generate", "primary", generationErrors.length ? "disabled" : "")}${hasListing ? `<div class="listing-fields">${compact ? `<div class="listing-preview"><div class="listing-preview-header">${cardVisual(active, true)}<div><span class="eyebrow">APERÇU VINTED</span><h3 id="listing-preview-title">${esc(active.title)}</h3></div></div><p id="listing-preview-description">${esc(active.description)}</p><div class="listing-price"><span>Prix de vente</span><strong>${money(+active.price)}</strong></div></div><details class="edit-listing"><summary>${icon("edit")} Modifier le titre ou la description</summary>${fields}</details>` : fields}${vintedTransferView(errors)}<details class="manual-tools"><summary>Copier le texte ou télécharger les photos</summary><p>Retrouvez vos originaux et votre texte pour les utiliser ailleurs.</p><a class="inline-link" href="https://www.vinted.fr/items/new" target="_blank" rel="noopener noreferrer">Ouvrir Vinted pour un transfert manuel ↗</a><div class="actions">${btn("Copier le titre", "copy-title", "secondary")}${btn("Copier la description", "copy-description", "secondary")}${btn(icon("download") + " Télécharger le dossier ZIP", "listing-zip", "secondary", errors.length ? "disabled" : "")}</div></details><details class="listing-tracking" ${["Publiée", "Vendue"].includes(active.status) ? "open" : ""}><summary>Suivre cette annonce</summary><p>Après publication, ajoutez le lien Vinted et confirmez son statut ici.</p>${input("Lien de votre annonce publiée", "listingUrl", active.listingUrl, "url", 'placeholder="https://www.vinted.fr/items/…"')}<div class="actions">${btn("Confirmer la publication manuellement", "published", "secondary", errors.length ? "disabled" : "")}${btn("Marquer comme vendue", "sold", "text-button", active.status !== "Publiée" ? "disabled" : "")}</div><p class="field-help">Le suivi est déclaré par vous, après vérification sur Vinted.</p></details></div>` : ""}<details class="card-admin"><summary>Historique et gestion de la carte</summary>${
    active.history
      .slice()
      .reverse()
      .map(
        (h) =>
          `<p class="muted">${esc(new Date(h.at).toLocaleString("fr-FR"))} — ${esc(h.action)}</p>`,
      )
      .join("") || '<p class="muted">Aucune action enregistrée.</p>'
  }<div class="actions">${btn("Archiver la carte", "archive", "secondary")}${btn("Supprimer cet exemplaire", "delete", "danger")}</div></details></section>`;
}
function routeForView() {
  if (view === "editor" && active)
    return `#/cards/${active.id}/${quickMode ? quickStage : `advanced/${step}`}`;
  return (
    {
      dashboard: "#/",
      inventory: "#/cards",
      settings: "#/settings",
      help: "#/help",
    }[view] || "#/"
  );
}
function openPhoto(side) {
  const photo = active?.photos.find((p) => p.side === side);
  if (!photo) return;
  let dialog = document.querySelector("#photo-viewer");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "photo-viewer";
    dialog.className = "photo-viewer";
    dialog.setAttribute("aria-labelledby", "photo-viewer-title");
    document.body.append(dialog);
    dialog.addEventListener("click", (event) => {
      const box = dialog.getBoundingClientRect();
      if (
        event.target === dialog &&
        (event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom)
      )
        dialog.close();
    });
  }
  const label = side === "back" ? "Verso" : "Recto";
  dialog.innerHTML = `<div class="photo-viewer-header"><div><span class="eyebrow">VOTRE PHOTO ORIGINALE</span><h2 id="photo-viewer-title">${label} · ${esc(active.name || "Votre carte")}</h2></div><form method="dialog"><button type="submit" class="photo-viewer-close" aria-label="Fermer la photo">×</button></form></div><div class="photo-viewer-image"><img src="${esc(photo.data)}" alt="${label} de ${esc(active.name || "la carte")}"></div><p class="photo-viewer-hint">Vérifiez les coins, les bords et la surface de votre carte.</p>`;
  dialog.showModal();
}

function readRoute() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  if (parts[0] === "cards" && parts[1]) {
    if (active?.id !== parts[1]) previewSide = "front";
    active = cards.find((c) => c.id === parts[1]);
    if (!active) {
      view = "inventory";
      return;
    }
    view = "editor";
    quickMode = parts[2] !== "advanced";
    step = Math.max(0, Math.min(4, Number(parts[3]) || 0));
    quickStage = ["photos", "review", "listing"].includes(parts[2])
      ? parts[2]
      : cardStage(active);
    if (quickStage === "listing" && !listingReady(active))
      quickStage = "review";
    reviewErrors = {};
    quickMessage = "";
  } else
    view =
      { cards: "inventory", settings: "settings", help: "help" }[parts[0]] ||
      "dashboard";
}
let firstRender = true;
function render(preserveFocus = false, updateRoute = true) {
  const focused = preserveFocus ? document.activeElement : null;
  const detailsState = preserveFocus
    ? new Map(
        [...app.querySelectorAll("details")].map((d) => [
          d.querySelector("summary")?.textContent.trim(),
          d.open,
        ]),
      )
    : null;
  const selector = focused?.dataset.field
    ? `[data-field="${CSS.escape(focused.dataset.field)}"]`
    : focused?.id
      ? `#${CSS.escape(focused.id)}`
      : focused?.dataset.group
        ? `[data-group="${CSS.escape(focused.dataset.group)}"]`
        : null;
  const selection =
    focused?.selectionStart != null
      ? [focused.selectionStart, focused.selectionEnd]
      : null;
  const scroll = window.scrollY;
  if (view === "editor") renderEditor();
  else if (view === "inventory") renderInventory();
  else if (view === "settings") renderSettings();
  else if (view === "help") renderHelp();
  else renderDashboard();
  if (updateRoute && location.hash !== routeForView())
    history[firstRender ? "replaceState" : "pushState"](
      null,
      "",
      routeForView(),
    );
  firstRender = false;
  if (detailsState)
    for (const details of app.querySelectorAll("details")) {
      const key = details.querySelector("summary")?.textContent.trim();
      if (detailsState.has(key)) details.open = detailsState.get(key);
    }
  if (preserveFocus && selector) {
    const replacement = document.querySelector(selector);
    replacement?.focus({ preventScroll: true });
    if (selection && replacement?.setSelectionRange)
      replacement.setSelectionRange(...selection);
    window.scrollTo({ top: scroll, behavior: "instant" });
  }
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
  if (event.target.closest(".skip-link")) {
    event.preventDefault();
    document.querySelector("#main-content")?.focus();
    return;
  }
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
    if (action === "check-vinted") {
      await refreshVintedConnection();
      toast(
        vintedHelper.ready
          ? "Vinted est prêt à recevoir vos annonces."
          : "Consultez les étapes d’installation ci-dessous.",
        !vintedHelper.ready,
      );
      return;
    }
    if (action === "filter-cards") {
      statusFilter = target.dataset.group;
      render(true);
      return;
    }
    if (action === "show-cards") {
      statusFilter = target.dataset.group;
      query = "";
      view = "inventory";
      render();
      focusStage();
      return;
    }
    if (action === "preview-side") {
      const side = target.dataset.side;
      if (
        !["front", "back"].includes(side) ||
        !active?.photos.some((p) => p.side === side)
      )
        return;
      previewSide = side;
      render(true);
      return;
    }
    if (action === "view-photo") {
      openPhoto(target.dataset.side);
      return;
    }
    if (action === "clear-filters") {
      query = "";
      statusFilter = "all";
      renderInventory();
      document.querySelector("#inventory-search")?.focus();
      return;
    }
    if (action === "quick-stage") {
      const desired = target.dataset.stage;
      if (!["photos", "review", "listing"].includes(desired)) return;
      if (desired === "listing" && !listingReady(active)) return;
      quickStage = desired;
      reviewErrors = {};
      render();
      focusStage();
      return;
    }
    if (action === "vinted-fill") {
      await runJob("Connexion au compagnon Vinted…", async () => {
        makeVintedDraft(active);
        vintedHelper = await checkVintedHelper();
        if (!vintedHelper.ready) {
          render();
          const instructions = document.querySelector("#vinted-install");
          instructions.open = true;
          instructions.scrollIntoView({ behavior: "smooth", block: "start" });
          toast(
            vintedHelper.connected
              ? "Mettez à jour l’extension puis rechargez-la dans Chrome / Edge."
              : "Activez le compagnon une seule fois, puis rechargez l’application.",
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
    if (["dashboard", "inventory", "settings", "help"].includes(action)) {
      view = action;
      render();
      focusStage();
      return;
    }
    if (action === "new") {
      previewSide = "front";
      active =
        cards.find(
          (c) =>
            !c.photos.length &&
            !c.name &&
            !c.number &&
            !c.title &&
            !c.condition &&
            !c.defects.length &&
            !c.observations.length &&
            !c.set &&
            !c.variant &&
            !["Archivée", "Vendue", "Publiée"].includes(c.status) &&
            !c.defectNotes &&
            !c.price,
        ) || newCard();
      quickMode = true;
      quickStage = "photos";
      reviewErrors = {};
      quickMessage = "";
      if (!cards.some((c) => c.id === active.id)) cards.unshift(active);
      await persist();
      view = "editor";
      step = 0;
      candidates = [];
      render();
      focusStage();
      return;
    }
    if (action === "edit") {
      previewSide = "front";
      active = cards.find((c) => c.id === target.dataset.id);
      if (!active) return;
      quickMode = true;
      quickStage = cardStage(active);
      reviewErrors = {};
      quickMessage = "";
      view = "editor";
      step = 0;
      candidates = [];
      render();
      focusStage();
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
      if (quickMode) quickStage = cardStage(active);
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
      reviewErrors = reviewIssues(proposed);
      if (errors.length || Object.keys(reviewErrors).length) {
        render();
        document.querySelector('[aria-invalid="true"]')?.focus();
        toast(errors.join(" ") || "Complétez les champs indiqués.", true);
        return;
      }
      if (listingReady(active)) {
        quickStage = "listing";
        render();
        focusStage();
        return;
      }
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
      quickStage = "listing";
      reviewErrors = {};
      render();
      focusStage();
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
      try {
        localStorage.setItem(
          "poke-scan-sell:last-backup",
          new Date().toISOString(),
        );
      } catch {
        /* Optional preference. */
      }
      if (view === "settings") renderSettings();
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
function updateField(el) {
  const f = el.dataset.field;
  const value = el.type === "checkbox" ? el.checked : el.value;
  delete reviewErrors[f];
  const unchanged =
    typeof value === "boolean"
      ? active[f] === value
      : String(active[f] ?? "") === value;
  if (unchanged) return;
  active[f] = value;
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
    if (el.id === "inventory-sort") {
      inventorySort = el.value;
      render(true);
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
      clearTimeout(fieldSaveTimer);
      fieldSaveTimer = null;
      const editing = active;
      const f = el.dataset.field;
      updateField(el);
      if (
        f === "identityConfirmed" &&
        el.checked &&
        (!active.name.trim() || !active.number.trim())
      ) {
        active.identityConfirmed = false;
        throw new Error("Renseignez le nom et le numéro de la carte.");
      }
      await persist();
      if (active !== editing || view !== "editor") return;
      if (["title", "description"].includes(f)) {
        const preview = document.querySelector(`#listing-preview-${f}`);
        if (preview) preview.textContent = active[f];
        for (const button of app.querySelectorAll(
          '[data-action="vinted-fill"], [data-action="listing-zip"]',
        ))
          button.disabled = !listingReady(active);
      }
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
        render(true);
    }
  }),
);
app.addEventListener("input", (event) => {
  if (event.target.id === "inventory-search") {
    query = event.target.value;
    const list = inventoryCards();
    document.querySelector("#collection-results").innerHTML = collectionGrid(
      list,
      { filtered: !!cards.length },
    );
    document.querySelector("#collection-count").textContent =
      `${list.length} carte${list.length > 1 ? "s" : ""} affichée${list.length > 1 ? "s" : ""}`;
  } else if (
    event.target.dataset.field &&
    event.target.type !== "checkbox" &&
    event.target.tagName !== "SELECT"
  ) {
    clearTimeout(fieldSaveTimer);
    const el = event.target,
      id = active?.id;
    updateField(el);
    setSaveStatus("Enregistrement…");
    fieldSaveTimer = setTimeout(() => {
      fieldSaveTimer = null;
      if (active?.id !== id) return;
      if (el.isConnected)
        el.dispatchEvent(new Event("change", { bubbles: true }));
      else runJobQuiet(persist);
    }, 350);
  }
});
app.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id === "quick-review") {
    event.target.querySelector('[data-action="quick-validate"]')?.click();
    return;
  }
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
  readRoute();
  render();
} catch {
  app.innerHTML =
    '<main class="fatal"><h1>Le stockage local est indisponible.</h1><p>Autorisez les données de ce site dans votre navigateur pour conserver vos cartes.</p></main>';
}
async function refreshVintedConnection() {
  vintedHelper = await checkVintedHelper();
  const connection = document.querySelector("#vinted-connection-status");
  if (connection) connection.textContent = vintedConnectionText();
  if (!vintedHelper.ready || !active?.vintedTransferId) return;
  const card = active;
  try {
    const receipt = await getVintedStatus(card.vintedTransferId);
    if (active !== card) return;
    if (receipt.status === "filled")
      card.vintedTransferMessage =
        "Titre, description, prix et état remplis ; photos transmises au formulaire. Vérifiez le résultat et les champs restants sur Vinted avant de publier.";
    else if (["partial", "blocked"].includes(receipt.status))
      card.vintedTransferMessage =
        "Le remplissage demande votre attention. Consultez le message Poke Scan Sell dans l’onglet Vinted pour reprendre ou compléter les champs.";
    const status = document.querySelector("#vinted-transfer-status");
    if (status) status.textContent = card.vintedTransferMessage;
  } catch {
    // A closed or expired transfer can be sent again from the current draft.
  }
}
window.addEventListener("hashchange", () => {
  if (busy) {
    history.replaceState(null, "", routeForView());
    return;
  }
  readRoute();
  render(false, false);
  focusStage();
});
for (const type of ["dragover", "dragleave", "drop"])
  app.addEventListener(type, (event) => {
    const slot = event.target.closest(".photo-slot[data-side]");
    if (!slot) return;
    event.preventDefault();
    slot.classList.toggle("drag-over", type === "dragover");
    if (type !== "drop" || busy || !event.dataTransfer?.files[0]) return;
    const input = slot.querySelector(".photo-input");
    const transfer = new DataTransfer();
    transfer.items.add(event.dataTransfer.files[0]);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
window.addEventListener("focus", refreshVintedConnection);
refreshVintedConnection();
