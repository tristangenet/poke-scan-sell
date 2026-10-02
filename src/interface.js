import { money } from "./domain.js";
import { PRODUCT, CONDITION_LABELS, cardGroup, cardStage } from "./ui-state.js";

const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  scan: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M7 12h10"/>',
  stack: '<path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  camera:
    '<rect x="3" y="6" width="18" height="15" rx="3"/><path d="m8 6 2-3h4l2 3"/><circle cx="12" cy="13" r="4"/>',
  settings:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  external: '<path d="M14 3h7v7m0-7L11 13M9 3H3v18h18v-6"/>',
  edit: '<path d="m15 5 4 4M4 20l4-1L21 6l-4-4L4 15z"/>',
  shield:
    '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
export const icon = (n) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n] || icons.stack}</svg>`;
export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const badge = (s) =>
  `<span class="badge ${s === "Publiée" || s === "Vendue" ? "green" : ""}">${esc(s)}</span>`;
export const btn = (label, action, cls = "primary", extra = "") =>
  `<button ${extra.includes("type=") ? "" : 'type="button"'} class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
export const input = (label, field, value, type = "text", extra = "") =>
  `<label class="field">${label}<input data-field="${field}" type="${type}" value="${esc(value)}" ${extra}></label>`;
export const select = (label, field, value, options) =>
  `<label class="field">${label}<select data-field="${field}">${options.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;

export function cardVisual(c, decorative = false) {
  const photo = c.photos.find((p) => p.side === "front");
  return photo
    ? `<img class="card-photo" src="${esc(photo.data)}" alt="${decorative ? "" : `Recto de ${esc(c.name || "la carte")}`}" loading="lazy">`
    : `<div class="card-placeholder">${icon("camera")}<span>Photo à ajouter</span></div>`;
}

export function layout(content, { view, version, stage = "photos" }) {
  const page = {
    dashboard: "Accueil",
    inventory: "Mes cartes",
    settings: "Paramètres",
    help: "Aide",
    editor: "Nouvelle annonce",
  }[view];
  const nav = [
    ["dashboard", "grid", "Accueil"],
    ["new", "scan", "Scanner"],
    ["inventory", "stack", "Mes cartes"],
    ["help", "help", "Aide"],
    ["settings", "settings", "Paramètres"],
  ];
  const brand = `<a class="brand" href="#/" data-action="dashboard" aria-label="${PRODUCT.name} — Accueil"><img src="/icon.svg" alt=""><span>Poke <span class="brand-light">Scan Sell</span><small>${PRODUCT.tagline}</small></span></a>`;
  return `<a class="skip-link" href="#main-content">Aller au contenu</a><aside class="sidebar">${brand}<div class="nav-label">MON ESPACE</div><nav aria-label="Navigation principale">${nav.map(([action, i, label]) => btn(icon(i) + `<span>${label}</span>`, action, `nav-item ${view === action || (action === "new" && view === "editor") ? "selected" : ""}`, view === action || (action === "new" && view === "editor") ? 'aria-current="page"' : "")).join("")}</nav><div class="sidebar-bottom"><div class="local-info">${icon("shield")}<div><strong>Votre collection, à vous.</strong><p>Enregistrée sur cet appareil.<br>Pensez à la sauvegarder.</p></div></div>${btn(icon("download") + " Sauvegarder", "export", "sidebar-export")}</div></aside><div class="workspace"><header class="topbar"><div class="mobile-brand">${brand}</div><div class="breadcrumb">Mon espace <span>/ ${view === "editor" ? { photos: "Photos", review: "Vérification", listing: "Annonce" }[stage] || page : page}</span></div><div class="topbar-actions"><span id="save-status" class="save-status" role="status" aria-live="polite">${icon("check")} Sur cet appareil</span>${btn(icon("help") + " Besoin d’aide ?", "help", "text-button")}</div></header><main id="main-content" tabindex="-1">${content}</main><footer><span>${PRODUCT.name} · v${esc(version)}</span><span>Préparez vos cartes. Publiez à votre rythme.</span></footer></div>`;
}

export function collectionGrid(list, { filtered = false } = {}) {
  if (!list.length)
    return `<div class="empty"><div class="empty-icon">${icon(filtered ? "search" : "stack")}</div><h3>${filtered ? "Aucune carte ne correspond." : "Votre première carte vous attend."}</h3><p>${filtered ? "Essayez un autre nom ou effacez les filtres." : "Ajoutez deux photos pour préparer votre première annonce."}</p>${filtered ? btn("Effacer les filtres", "clear-filters", "secondary") : btn(icon("plus") + " Ajouter une carte", "new")}</div>`;
  const groupNames = {
    draft: "À préparer",
    ready: "Prête à vendre",
    listed: "En vente",
    sold: "Vendue",
    archived: "Archivée",
  };
  return `<div class="collection-grid">${list.map((c) => `<button class="collection-card" data-action="edit" data-id="${esc(c.id)}"><div class="card-image">${cardVisual(c)}<span class="badge ${["ready", "listed", "sold"].includes(cardGroup(c)) ? "green" : ""}">${groupNames[cardGroup(c)]}</span></div><div class="card-info"><small>${esc(c.number || "Numéro à identifier")} · ${esc(c.language.toUpperCase())}</small><h3>${esc(c.name || "Nouvelle carte")}</h3><div class="card-meta"><span>${cardGroup(c) === "draft" ? "Reprendre la préparation" : cardGroup(c) === "ready" ? "Voir mon annonce" : "Voir la carte"}</span><strong>${+c.price > 0 ? money(+c.price) : "—"}</strong></div></div></button>`).join("")}</div>`;
}

export function dashboardView(cards) {
  const drafts = cards.filter((c) => cardGroup(c) === "draft");
  const ready = cards.filter((c) => cardGroup(c) === "ready");
  const sold = cards.filter((c) => cardGroup(c) === "sold");
  const latest = [...cards].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  const resume = latest.find((c) => cardGroup(c) === "draft");
  return `<div class="page-heading"><div><div class="eyebrow">VOTRE ESPACE DE VENTE</div><h1>${cards.length ? "Prêt pour votre prochaine vente ?" : "Vendez vos cartes, simplement."}</h1><p>Vos photos, vos cartes et vos annonces. Tout au même endroit.</p></div>${btn(icon("plus") + " Ajouter une carte", "new")}</div>
  <section class="hero"><div class="hero-copy"><span class="hero-label">DEUX PHOTOS. MOINS DE SAISIE.</span><h2>Une carte à vendre ?<br>On prépare l’annonce.</h2><p>Ajoutez le recto et le verso, vérifiez les informations,<br class="desktop"> puis envoyez votre annonce sur Vinted.</p><div class="hero-actions">${resume ? btn(icon("arrow") + " Reprendre mon brouillon", "edit", "light", `data-id="${esc(resume.id)}"`) : btn(icon("scan") + " Préparer ma première annonce", "new", "light")}${btn("Comment ça marche ?", "help", "hero-link")}</div><div class="hero-note">${icon("check")} Vos modifications sont enregistrées au fur et à mesure.</div></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="decor-card back-card"></div><div class="decor-card front-card"><div class="decor-top">POKE SCAN SELL <span>✦</span></div><div class="decor-scene"><div class="orb"></div><span>✧</span></div><div class="decor-lines"><i></i><i></i><i></i></div></div><div class="floating-label">${icon("check")} Annonce prête à envoyer</div></div></section>
  <div class="stats"><article><div class="stat-icon">${icon("clock")}</div><div><span>À préparer</span><strong>${drafts.length}</strong><small>Reprenez vos brouillons</small></div></article><article><div class="stat-icon lime">${icon("check")}</div><div><span>Prêtes à vendre</span><strong>${ready.length}</strong><small>Vos annonces sont préparées</small></div></article><article><div class="stat-icon">${icon("stack")}</div><div><span>Cartes vendues</span><strong>${sold.length}</strong><small>Ventes que vous avez confirmées</small></div></article></div>
  <div class="section-heading"><div><h2>${cards.length ? "Vos dernières cartes" : "Comment ça marche"}</h2><p>${cards.length ? "Continuez à votre rythme, votre travail est conservé." : "Trois étapes, du scan à la mise en vente."}</p></div>${cards.length ? btn("Voir mes cartes " + icon("arrow"), "inventory", "text-button") : ""}</div>
  ${
    cards.length
      ? collectionGrid(latest.slice(0, 4))
      : `<div class="how-grid">${[
          [
            "camera",
            "01",
            "Ajoutez vos photos",
            "Le recto pour identifier la carte, le verso pour vérifier son état.",
          ],
          [
            "check",
            "02",
            "Vérifiez les informations",
            "Le nom et le numéro sont lus automatiquement. Choisissez l’état et le prix.",
          ],
          [
            "external",
            "03",
            "Envoyez sur Vinted",
            "Le compagnon remplit l’annonce. Relisez-la sur Vinted avant de publier.",
          ],
        ]
          .map(
            ([i, n, t, p]) =>
              `<article><div class="how-top"><span class="how-icon">${icon(i)}</span><span>${n}</span></div><h3>${t}</h3><p>${p}</p></article>`,
          )
          .join("")}</div>`
  }
  <div class="service-note">${icon("shield")}<div><strong>Vous gardez la main sur chaque annonce.</strong><p>Les photos restent sur cet appareil jusqu’à leur transfert. Le prix et l’état sont à vérifier avant de publier.</p></div>${btn("Voir le guide", "help", "text-button")}</div>`;
}

export function inventoryView(cards, list, { query, statusFilter, sort }) {
  const groups = [
    ["all", "Toutes"],
    ["draft", "À préparer"],
    ["ready", "Prêtes"],
    ["listed", "En vente"],
    ["sold", "Vendues"],
    ["archived", "Archives"],
  ];
  return `<div class="page-heading"><div><div class="eyebrow">VOTRE COLLECTION</div><h1>Mes cartes</h1><p>${cards.length} carte${cards.length > 1 ? "s" : ""} enregistrée${cards.length > 1 ? "s" : ""}. Retrouvez une annonce en quelques secondes.</p></div>${btn(icon("plus") + " Ajouter une carte", "new")}</div><div class="inventory-tools"><div class="collection-tabs" role="group" aria-label="Filtrer les cartes">${groups.map(([g, l]) => btn(`${l} <span>${g === "all" ? cards.length : cards.filter((c) => cardGroup(c) === g).length}</span>`, "filter-cards", `filter-chip ${g === statusFilter ? "active" : ""}`, `data-group="${g}" aria-pressed="${g === statusFilter}"`)).join("")}</div><div class="filters"><label class="search-field">${icon("search")}<input id="inventory-search" type="search" placeholder="Nom, numéro ou extension…" aria-label="Rechercher dans la collection" value="${esc(query)}"></label><select id="status-filter" class="mobile-filter" aria-label="Filtrer par statut">${groups.map(([g, l]) => `<option value="${g}" ${g === statusFilter ? "selected" : ""}>${l}</option>`).join("")}</select><select id="inventory-sort" aria-label="Trier les cartes">${[
    ["recent", "Modifiées récemment"],
    ["name", "Nom : A à Z"],
    ["price", "Prix : du plus élevé au plus bas"],
  ]
    .map(
      ([v, l]) =>
        `<option value="${v}" ${v === sort ? "selected" : ""}>${l}</option>`,
    )
    .join(
      "",
    )}</select></div></div><p id="collection-count" class="result-count" aria-live="polite">${list.length} carte${list.length > 1 ? "s" : ""} affichée${list.length > 1 ? "s" : ""}</p><div id="collection-results">${collectionGrid(list, { filtered: !!cards.length })}</div>`;
}

export function summaryView(card) {
  return `<div class="summary-preview">${cardVisual(card, true)}</div><h3>${esc(card.name || "Votre prochaine annonce")}</h3><p>${esc(card.number || "Le numéro sera lu sur le recto")}${card.name ? ` · ${esc(card.language.toUpperCase())}` : ""}</p><div class="summary-line"><span>Photos</span><strong>${card.photos.length} enregistrée${card.photos.length > 1 ? "s" : ""}</strong></div><div class="summary-line"><span>État</span><strong>${esc(CONDITION_LABELS[card.condition]?.split(" — ")[0] || "À vérifier")}</strong></div><div class="summary-line"><span>Prix de vente</span><strong>${+card.price > 0 ? money(+card.price) : "À choisir"}</strong></div><div class="summary-save">${icon("check")} Enregistré sur cet appareil</div>`;
}

export function wizardFrame(content, { card, stage }) {
  const labels = [
    ["photos", "Photos"],
    ["review", "Vérification"],
    ["listing", "Annonce"],
  ];
  const index = labels.findIndex(([s]) => s === stage);
  return `<div class="editor-heading"><div><div class="eyebrow">NOUVELLE ANNONCE</div><h1>Vendre une carte</h1><p>Une étape à la fois. Votre brouillon est conservé.</p></div><div class="saved">${badge(card.status)}</div></div><nav class="wizard-steps" aria-label="Étapes de votre annonce">${labels.map(([s, l], i) => btn(`<span class="step-number">${i < index ? icon("check") : i + 1}</span><span>${l}</span>`, "quick-stage", `${i === index ? "current" : i < index ? "done" : ""}`, `data-stage="${s}" ${s === stage ? 'aria-current="step"' : ""} ${s === "listing" && cardStage(card) !== "listing" ? "disabled" : ""} ${s === "review" && !card.name && !card.number && !card.photos.length ? "disabled" : ""}`)).join("")}</nav><div class="quick-layout"><section class="wizard-main">${content}<div class="wizard-footnote">${btn(icon("back") + " Mes cartes", "inventory", "text-button")}${btn("Options avancées", "advanced-mode", "text-button")}</div></section><aside class="summary panel" id="wizard-summary" aria-label="Résumé de la carte"><div class="eyebrow">VOTRE CARTE</div>${summaryView(card)}</aside></div>`;
}

export function settingsView({ cards, connection, installation, backupDate }) {
  return `<div class="page-heading"><div><div class="eyebrow">VOTRE ESPACE</div><h1>Paramètres</h1><p>Retrouvez votre connexion Vinted et les sauvegardes de vos cartes.</p></div></div><div class="settings-grid"><section class="panel"><div class="panel-icon">${icon("external")}</div><h2>Connexion à Vinted</h2><p>Installez le compagnon une fois dans Chrome ou Edge pour remplir vos annonces.</p><p id="vinted-connection-status" class="connection-status">${esc(connection)}</p>${btn("Vérifier la connexion", "check-vinted", "secondary")}${installation}</section><section class="panel"><div class="panel-icon">${icon("download")}</div><h2>Mes sauvegardes</h2><p>${cards.length} carte${cards.length > 1 ? "s" : ""} sur cet appareil. Téléchargez une copie de vos cartes et de leurs photos pour les conserver ou les transférer.</p><div class="actions">${btn(icon("download") + " Exporter l’inventaire", "export")}<label class="button secondary upload-control">Restaurer une sauvegarde<input class="sr-only" type="file" id="restore" accept="application/json" aria-label="Restaurer une sauvegarde"></label></div><p class="muted">${backupDate ? `Dernière sauvegarde : ${esc(backupDate)}.` : "Vous n’avez pas encore téléchargé de sauvegarde sur cet appareil."}</p><details><summary>Où sont enregistrées mes cartes ?</summary><p>Elles sont conservées dans ce navigateur, sur cet appareil. Effacer les données du site les supprime. Elles ne sont pas encore synchronisées entre appareils.</p><p>Une restauration ajoute les cartes sans remplacer les existantes. Le fichier peut contenir jusqu’à 50 Mo.</p></details></section></div><section class="panel settings-details"><h2>Analyse photo par IA</h2><p>Une option pour proposer le nom, le numéro et l’état depuis vos deux photos. Vous choisissez de l’activer lors de la préparation.</p><details><summary>Configurer le service IA de mon instance</summary><p>Cette configuration s’adresse à la personne qui héberge l’application. Configurez OPENAI_API_KEY et APP_ACCESS_TOKEN sur le serveur. Ici, renseignez seulement le code d’accès au service, jamais la clé OpenAI.</p><label class="field">Code d’accès au service IA<input id="vision-access" type="password" autocomplete="off" placeholder="Code fourni pour cette instance"></label><div class="actions">${btn("Enregistrer le code dans cet onglet", "save-vision-access", "secondary")}${btn("Effacer le code", "clear-vision-access", "text-button")}</div><p class="muted">Le code disparaît à la fermeture de l’onglet. Une analyse envoie les deux photos à OpenAI après votre accord ; les appels sont facturés au titulaire de la clé API.</p></details></section><section class="panel settings-details"><h2>Besoin d’un coup de main ?</h2><p>Photos, prix, installation du compagnon : le guide répond aux questions les plus courantes.</p>${btn("Ouvrir le guide d’utilisation " + icon("arrow"), "help", "secondary")}</section>`;
}

export function helpView(installation) {
  return `<div class="page-heading"><div><div class="eyebrow">GUIDE D’UTILISATION</div><h1>Votre première annonce, pas à pas.</h1><p>Tout ce qu’il faut pour commencer, même sans connaître les cartes Pokémon.</p></div>${btn(icon("scan") + " Ajouter une carte", "new")}</div><div class="help-steps"><article class="panel"><span class="help-number">1</span><h2>Photographiez les deux faces</h2><p>Posez la carte sur un fond uni, dans une lumière douce. Cadrez toute la carte, avec le nom et le numéro lisibles. Ajoutez le verso pour vérifier les coins, les bords et les défauts.</p><p class="muted">Sur téléphone, utilisez l’appareil photo. Sur ordinateur, importez une image ou déposez-la dans la zone correspondante.</p></article><article class="panel"><span class="help-number">2</span><h2>Vérifiez les informations et le prix</h2><p>L’application lit le nom et le numéro. Corrigez-les si besoin, choisissez l’état après examen des deux faces et indiquez votre prix. L’édition reste facultative.</p><p class="muted">La tendance Cardmarket est un point de départ général. Ajustez le prix à l’état de votre carte et comparez les annonces Vinted.</p></article><article class="panel"><span class="help-number">3</span><h2>Envoyez l’annonce sur Vinted</h2><p>Cliquez sur « Remplir mon annonce sur Vinted ». Le compagnon transfère les photos, le titre, la description, le prix et l’état. Vérifiez le formulaire, le chargement des photos et le format du colis avant de publier.</p><p class="muted">Votre connexion se fait directement sur Vinted. Vous gardez le clic final sur « Publier ».</p></article></div><section class="panel"><h2>Installer le compagnon Vinted</h2><p>À faire une seule fois dans le navigateur utilisé pour vendre vos cartes.</p>${installation}</section><section class="panel faq"><h2>Les réponses à vos questions</h2>${[
    [
      "Faut-il connaître l’édition exacte ?",
      "Non. Le nom et le numéro suffisent pour préparer une annonce. L’extension et la variante sont facultatives. Une tendance de prix n’est proposée que si une référence catalogue unique est identifiée.",
    ],
    [
      "Quel état choisir ?",
      "Quasi neuf : presque aucune marque visible. Excellent : quelques marques légères. Bon état : défauts visibles. Pour une carte usée, très usée ou endommagée, choisissez le niveau correspondant et décrivez les défauts. Regardez toujours le recto et le verso.",
    ],
    [
      "Le prix proposé est-il garanti ?",
      "Non. La tendance Cardmarket est un indicateur général, sans filtrage garanti par langue, variante ou état. Une estimation selon votre état utilise les comparables que vous avez vérifiés. Le prix final reste votre choix.",
    ],
    [
      "Puis-je reprendre une annonce plus tard ?",
      "Oui. Vos modifications sont enregistrées sur cet appareil. Retrouvez la carte dans « Mes cartes » et reprenez son brouillon. Exportez une sauvegarde avant de changer de navigateur ou de supprimer ses données.",
    ],
    [
      "Vinted n’est pas rempli : que faire ?",
      "Ouvrez les paramètres pour vérifier le compagnon et son association à cette adresse. Sur Vinted, consultez le message du compagnon et utilisez « Reprendre le remplissage ». Les champs non reconnus sont signalés. Un brouillon déjà présent est conservé.",
    ],
    [
      "Puis-je l’utiliser sur téléphone ?",
      "Oui, pour photographier vos cartes, vérifier les informations et préparer vos annonces. Le remplissage automatique de Vinted utilise le compagnon Chrome ou Edge sur ordinateur. Sur téléphone, vous pouvez copier le texte ou télécharger le dossier de photos. Pour reprendre sur un autre appareil, exportez puis restaurez votre sauvegarde.",
    ],
    [
      "Où vont mes photos ?",
      "La lecture locale se fait dans votre navigateur. Les recherches catalogue transmettent le nom, le numéro et la langue, sans les photos. Si vous choisissez l’analyse IA, les deux photos sont envoyées à OpenAI via le serveur. Le transfert Vinted envoie vos originaux au formulaire.",
    ],
    [
      "Comment déclarer une vente ?",
      "Après publication, ouvrez « Suivre cette annonce » et ajoutez son lien Vinted. Confirmez sa publication puis indiquez lorsqu’elle est vendue. Ces statuts sont déclarés par vous.",
    ],
  ]
    .map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`)
    .join("")}</section>`;
}
