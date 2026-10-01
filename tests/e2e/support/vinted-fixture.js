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
<label for="price">Prix</label><input id="price" type="text" inputmode="decimal">
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
