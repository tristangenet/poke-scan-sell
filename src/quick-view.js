import { money } from "./domain.js";
import { CONDITION_LABELS, cardmarketSearchUrl } from "./ui-state.js";
import { icon, esc, btn, input, select, wizardFrame } from "./interface.js";

function reviewField(label, field, value, errors, type = "text", extra = "") {
  const error = errors[field];
  return input(
    label,
    field,
    value,
    type,
    `${extra} ${error ? `aria-invalid="true" aria-describedby="error-${field}"` : ""}`,
  ).replace(
    "</label>",
    `${error ? `<span class="field-error" id="error-${field}">${esc(error)}</span>` : ""}</label>`,
  );
}

export function quickView({
  card: c,
  stage,
  photos,
  listing,
  e,
  message,
  errors,
  previewSide,
}) {
  const hasPhotos = ["front", "back"].every((side) =>
    c.photos.some((p) => p.side === side),
  );
  let content;
  if (stage === "photos") {
    content = `${photos}<section class="panel prepare-panel"><div><h2>La suite ? On s’en occupe.</h2><p>Le nom et le numéro sont lus sur le recto. Vous vérifierez ensuite l’état et le prix.</p></div><details class="analysis-options"><summary>Langue et options d’analyse</summary>${select(
      "Langue de la carte",
      "language",
      c.language,
      [
        ["fr", "Français"],
        ["en", "Anglais"],
      ],
    )}<label class="check-row"><input id="quick-ai" type="checkbox">Ajouter l’analyse photo par IA</label><p class="muted">Si ce service est configuré, cette option envoie le recto et le verso à OpenAI via le serveur pour proposer l’identité et l’état. L’appel est facturé au titulaire de la clé API.</p></details><div id="job-status" role="status" aria-live="polite">${esc(message)}</div><div class="wizard-actions"><div>${!hasPhotos ? '<p class="muted">Ajoutez le recto et le verso pour continuer.</p>' : `<p class="ready-note">${icon("check")} Vos deux photos sont prêtes.</p>`}</div>${btn(icon("scan") + (c.name || c.ocrText ? "Relancer la préparation" : "Préparer ma carte"), "quick-prepare", "primary", !hasPhotos ? "disabled" : "")}</div>${hasPhotos ? btn("Saisir les informations moi-même", "quick-stage", "text-button", 'data-stage="review"') : ""}</section>`;
  } else if (stage === "review") {
    const conditionError = errors.condition;
    const photoError = !hasPhotos
      ? `<p class="notice amber">Il manque une photo de la carte. ${btn("Ajouter les photos", "quick-stage", "text-button", 'data-stage="photos"')}</p>`
      : "";
    const condition = select("État de la carte", "condition", c.condition, [
      ["", "Choisir l’état après vérification"],
      ...Object.entries(CONDITION_LABELS),
    ])
      .replace(
        "<select ",
        `<select ${conditionError ? 'aria-invalid="true" aria-describedby="error-condition"' : ""} `,
      )
      .replace(
        "</label>",
        `${conditionError ? `<span id="error-condition" class="field-error">${esc(conditionError)}</span>` : ""}</label>`,
      );
    content = `<section class="panel review-panel"><div class="section-intro"><span class="panel-icon">${icon("check")}</span><div><h2 id="stage-title" tabindex="-1">Vérifiez votre carte</h2><p>Ajustez les informations si nécessaire, puis choisissez votre prix.</p></div></div>${photoError}<div id="job-status" role="status" aria-live="polite">${esc(message || (c.catalogId ? "Le nom et le numéro ont été identifiés. Vérifiez-les sur votre carte." : c.name && c.number ? "Nom et numéro renseignés. L’édition est facultative." : "Complétez les informations qui n’ont pas pu être lues."))}</div>${Object.keys(errors).length ? '<p class="notice amber" role="alert">Quelques informations sont à compléter. Les champs concernés sont indiqués ci-dessous.</p>' : ""}<form id="quick-review" novalidate><div class="form-section-label"><span>01</span> Identité de la carte</div><div class="form-grid">${reviewField("Nom de la carte", "name", c.name, errors, "text", 'autocomplete="off" placeholder="Ex. Dracaufeu"')}${reviewField("Numéro de la carte", "number", c.number, errors, "text", 'autocomplete="off" placeholder="Ex. 4/102"')}</div><div class="review-condition"><div class="form-section-label"><span>02</span> État de votre exemplaire</div>${condition}<p class="field-help">Examinez les coins, les bords et les deux faces. L’état de Vinted sera sélectionné depuis ce choix.</p>${c.aiAnalysis ? `<p class="notice">Suggestion IA : ${esc(CONDITION_LABELS[c.aiAnalysis.condition] || c.aiAnalysis.condition)}. ${c.aiAnalysis.defects.map(esc).join(" ; ")}${c.aiAnalysis.warnings.map((w) => `<br>${esc(w)}`).join("")}</p>` : ""}<details ${c.defectNotes || c.defects.length ? "open" : ""}><summary>Préciser les défauts de la carte</summary><label class="field">Défauts et remarques<textarea data-field="defectNotes" rows="2" placeholder="Ex. petit point blanc au dos, coin légèrement usé…">${esc(c.defectNotes)}</textarea></label>${c.defects.length ? `<p class="muted">Défauts enregistrés : ${c.defects.map(esc).join(", ")}.</p>` : ""}</details></div><div class="quick-price"><div class="price-heading"><h3>${icon("bolt")} Votre prix de vente</h3><span>EUR</span></div>${e.available ? `<p>Estimation issue de vos comparables : <strong>${money(e.price)}</strong></p>${btn("Utiliser le prix conseillé", "apply-price", "secondary")}` : c.market?.trend ? `<div class="price-reference"><div><span>Tendance Cardmarket</span><strong>${money(c.market.trend)}</strong></div>${btn("Utiliser cette tendance comme point de départ", "use-trend", "secondary")}</div><p class="field-help">Indicateur général, sans filtrage garanti par état, langue ou variante. Ajustez le prix à votre carte.</p>` : '<p class="field-help">Aucun prix de référence disponible. Choisissez votre prix ou comparez les annonces.</p>'}${reviewField("Prix de vente (€)", "price", c.price, errors, "number", 'min="0.01" max="100000" step="0.01" inputmode="decimal" placeholder="0,00"')}<div class="price-links"><a class="inline-link" href="https://www.vinted.fr/catalog?search_text=${encodeURIComponent([c.name, c.number, c.set].join(" "))}" target="_blank" rel="noopener noreferrer"><span class="market-mark vinted-mark" aria-hidden="true">V</span><span>Comparer les annonces Vinted</span>${icon("external")}</a><a class="inline-link" href="${esc(cardmarketSearchUrl(c))}" target="_blank" rel="noopener noreferrer"><span class="market-mark" aria-hidden="true">C</span><span>Comparer les annonces Cardmarket</span>${icon("external")}</a></div></div><details class="optional-details"><summary>Extension et variante (facultatif)</summary><div class="form-grid">${input("Extension (facultatif)", "set", c.set)}${c.variantOptions?.length ? select("Variante (facultatif)", "variant", c.variant, [["", "Non précisée"], ...[...new Set([...c.variantOptions, c.variant].filter(Boolean))].map((v) => [v, v])]) : input("Variante / édition (facultatif)", "variant", c.variant)}</div></details>${c.ocrText ? `<details><summary>Voir le texte lu sur la photo</summary><pre>${esc(c.ocrText)}</pre></details>` : ""}<div class="wizard-actions">${btn(icon("back") + " Photos", "quick-stage", "secondary", 'data-stage="photos"')}${btn((c.title ? "Valider et actualiser mon annonce" : "Valider ma carte et créer l’annonce") + icon("arrow"), "quick-validate", "primary", `type="submit" ${!hasPhotos ? "disabled" : ""}`)}</div><p class="field-help validation-note">En continuant, vous confirmez avoir vérifié le nom, le numéro, l’état et les défauts sur les deux faces.</p></form></section>`;
  } else {
    content = `<div class="listing-top-note">${icon("check")}<div><strong>Votre annonce est prête.</strong><span>Relisez-la, puis envoyez-la sur Vinted.</span></div>${btn(icon("edit") + " Modifier les informations", "quick-stage", "text-button", 'data-stage="review"')}</div>${listing}`;
  }
  return wizardFrame(content, { card: c, stage, previewSide });
}
