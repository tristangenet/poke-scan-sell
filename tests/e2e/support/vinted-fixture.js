export const data =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1sAAAAASUVORK5CYII=";
export const draft = {
  title: "Pokémon Dracaufeu 4/102 — FR",
  description:
    "Carte Pokémon Dracaufeu — 4/102. État excellent.\nDescription corrigée par le vendeur.",
  price: 12.25,
  condition: "EX",
  photos: [
    { side: "front", type: "image/png" },
    { side: "back", type: "image/png" },
  ],
};
export const fixture = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Formulaire de contrôle Vinted</title></head><body>
<h1>Vends ton article — formulaire de contrôle</h1><form>
<label for="title">Titre</label><input id="title" maxlength="100">
<label for="description">Description</label><textarea id="description"></textarea>
<label for="price">Prix</label><input id="price" type="text" inputmode="decimal" placeholder="0,00">
<label for="catalog_id">Catégorie</label><select id="catalog_id"><option value="">Choisir</option><option value="other">Autre</option><option value="cards">Cartes à collectionner</option></select>
<label for="status_id">État</label><select id="status_id"><option value="">Choisir</option><option value="very-good">Très bon état</option><option value="good">Bon état</option></select>
<label for="images">Photos</label><input id="images" type="file" accept="image/*" multiple>
<button type="submit" id="publish">Publier</button></form><div id="photo-result"></div>
<script>
window.published = 0; window.formState = {};
document.querySelector('form').addEventListener('submit', e => { e.preventDefault(); window.published++; });
for(const el of document.querySelectorAll('input:not([type=file]), textarea, select')) el.addEventListener('input', () => window.formState[el.id] = el.value);
document.querySelector('#images').addEventListener('change', async e => {
  window.uploadedPhotos = await Promise.all([...e.target.files].map(async f => ({ name:f.name, type:f.type, bytes:[...new Uint8Array(await f.arrayBuffer())] })));
  document.querySelector('#photo-result').textContent = window.uploadedPhotos.length + ' photos reçues';
});
</script></body></html>`;

// Controlled selector based on the supplied screenshot: a short option title,
// separate descriptive text and a radio on the right, without text newlines.
export function installConditionSelector({
  kind = "radio",
  delayed = false,
  rejected = false,
  ambiguous = false,
} = {}) {
  document.querySelector('[for="status_id"]').remove();
  document.getElementById("status_id").remove();
  const section = document.createElement("section");
  section.innerHTML =
    kind === "button"
      ? '<span>État</span><button type="button" id="state-trigger" aria-expanded="false" aria-controls="state-menu"><span>État</span><span>Sélectionne un état</span></button>'
      : '<h4>État</h4><input id="state-trigger" readonly data-testid="condition-field--input" placeholder="Sélectionne un état" aria-expanded="false" aria-controls="state-menu">';
  const trigger = section.querySelector("#state-trigger");
  if (kind === "row") {
    trigger.removeAttribute("data-testid");
    section.querySelector("h4").outerHTML = "<span>Qualité de l’article</span>";
  }
  const menu = document.createElement("div");
  menu.id = "state-menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;
  const options = [
    [
      "new-tag",
      "Neuf avec étiquette",
      "Article neuf, jamais porté/utilisé avec étiquettes ou dans son emballage d’origine.",
    ],
    [
      "new",
      "Neuf sans étiquette",
      "Article neuf, jamais porté/utilisé, sans étiquettes ni emballage d’origine.",
    ],
    [
      "very-good",
      "Très bon état",
      "Article très peu porté/utilisé qui peut présenter de légères imperfections, mais qui reste en très bon état.",
    ],
    [
      "good",
      "Bon état",
      "Article porté/utilisé quelques fois, présentant des imperfections et des signes d’usure.",
    ],
    [
      "satisfactory",
      "Satisfaisant",
      "Article porté/utilisé avec des défauts visibles.",
    ],
  ];
  if (ambiguous)
    options.push([
      "other-very-good",
      "Très bon état",
      "Une autre option porte le même titre.",
    ]);
  for (const [value, title, description] of options) {
    const row = document.createElement(kind === "radio" ? "label" : "div");
    row.dataset.choice = value;
    row.innerHTML = `<div><span>${title}</span><p>${description}</p></div>`;
    if (kind === "radio" || kind === "row") {
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "item-state";
      radio.value = value;
      radio.hidden = kind === "row";
      row.append(radio);
    } else {
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", "false");
    }
    row.addEventListener("click", () => {
      if (window.rejectCondition) return;
      window.conditionCommitted = value;
      if (kind === "button") trigger.lastElementChild.textContent = title;
      else trigger.value = title;
      trigger.setAttribute("aria-expanded", "false");
      row.setAttribute("aria-selected", "true");
      menu.hidden = true;
    });
    menu.append(row);
  }
  window.rejectCondition = rejected;
  trigger.addEventListener("click", () => {
    menu.hidden = !menu.hidden;
    trigger.setAttribute("aria-expanded", String(!menu.hidden));
  });
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }
  });
  section.append(menu);
  if (delayed) {
    document.getElementById("catalog_id").addEventListener("change", () => {
      setTimeout(() => document.querySelector("form").append(section), 800);
    });
  } else document.querySelector("form").append(section);
}

export async function readyCard(page) {
  await page.goto("/");
  await page.evaluate(async (data) => {
    const { newCard, generateListing, listingFingerprint } =
      await import("/src/domain.js");
    const { saveCard } = await import("/src/storage.js");
    const card = Object.assign(newCard(), {
      name: "Dracaufeu",
      number: "4/102",
      condition: "EX",
      identityConfirmed: true,
      conditionConfirmed: true,
      price: 12.25,
      status: "Prête",
      photos: [
        { id: "front", side: "front", type: "image/png", data },
        { id: "back", side: "back", type: "image/png", data },
      ],
    });
    Object.assign(card, generateListing(card));
    card.description = "Description personnalisée pour Vinted.";
    card.listingFingerprint = listingFingerprint(card);
    await saveCard(card);
  }, data);
  await page.reload();
  await page.locator(".collection-card").first().click();
}
