import { readyErrors, listingFingerprint } from "./domain.js";

export const PRODUCT = {
  name: "Poke Scan Sell",
  tagline: "De la carte à l’annonce.",
};

export function cardmarketSearchUrl(card) {
  const query = [
    String(card.name || "").trim(),
    String(card.number || "")
      .split("/")[0]
      .trim(),
  ]
    .filter(Boolean)
    .join(" ");
  return `https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodeURIComponent(query)}&searchMode=v2`;
}

export const CONDITION_LABELS = {
  NM: "Quasi neuf — Near Mint",
  EX: "Excellent — quelques marques légères",
  GD: "Bon état — défauts visibles",
  LP: "Usé — usure marquée",
  PL: "Très usé",
  PO: "Endommagé",
  M: "Impeccable — Mint, à vérifier avec soin",
};

export function listingReady(card) {
  return !!(
    card.title?.trim() &&
    card.description?.trim() &&
    !readyErrors(card).length &&
    card.listingFingerprint === listingFingerprint(card)
  );
}

export function cardStage(card) {
  if (listingReady(card)) return "listing";
  if (
    card.name ||
    card.number ||
    card.ocrText ||
    card.aiAnalysis ||
    card.scanDiagnostics
  )
    return "review";
  return "photos";
}

export function cardGroup(card) {
  if (card.status === "Archivée") return "archived";
  if (card.status === "Vendue") return "sold";
  if (["Publiée", "Publication à vérifier"].includes(card.status))
    return "listed";
  return listingReady(card) ? "ready" : "draft";
}

export function filterCards(
  cards,
  { query = "", group = "all", sort = "recent" } = {},
) {
  const clean = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  return cards
    .filter(
      (c) =>
        (group === "all" || cardGroup(c) === group || c.status === group) &&
        clean(`${c.name} ${c.number} ${c.set}`).includes(clean(query)),
    )
    .sort((a, b) => {
      if (sort === "name")
        return String(a.name).localeCompare(String(b.name), "fr");
      if (sort === "price") return (+b.price || 0) - (+a.price || 0);
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
    });
}

export function reviewIssues(card) {
  const errors = {};
  if (!card.name?.trim()) errors.name = "Indiquez le nom écrit sur la carte.";
  if (!card.number?.trim())
    errors.number = "Indiquez son numéro, par exemple 4/102.";
  if (!card.condition)
    errors.condition = "Choisissez l’état après avoir vérifié les deux faces.";
  if (!Number.isFinite(+card.price) || +card.price <= 0)
    errors.price = "Indiquez un prix supérieur à 0 €.";
  else if (+card.price > 100000)
    errors.price = "Le prix doit être inférieur ou égal à 100 000 €.";
  return errors;
}
