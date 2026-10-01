export const CONDITIONS = {
  NM: "Near Mint — quasi neuf",
  EX: "Excellent — usure légère",
  GD: "Good — défauts visibles",
  LP: "Light Played — usure marquée",
  PL: "Played — très usée",
  PO: "Poor — endommagée",
  M: "Mint — vérification minutieuse",
};
export const TYPES = {
  asking: "Prix demandé",
  sold: "Vente réalisée vérifiée",
  aggregate: "Indicateur de marché",
};
export const STATUSES = [
  "À identifier",
  "À vérifier",
  "Estimée",
  "Prête",
  "Publication à vérifier",
  "Publiée",
  "Vendue",
  "Archivée",
];
export const money = (n) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    n,
  );
export const normalize = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
export const today = () => new Date().toISOString().slice(0, 10);
export function newCard() {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: "",
    number: "",
    set: "",
    language: "fr",
    variant: "",
    condition: "",
    conditionConfirmed: false,
    identityConfirmed: false,
    defects: [],
    defectNotes: "",
    photos: [],
    observations: [],
    status: "À identifier",
    price: "",
    strategy: "balanced",
    title: "",
    description: "",
    listingUrl: "",
    history: [],
  };
}
export function suggestedCondition(defects) {
  if (defects.includes("Pliure") || defects.includes("Humidité")) return "PO";
  if (defects.includes("Rayures")) return "GD";
  if (defects.length) return "EX";
  return "NM";
}
export function estimate(card, now = Date.now()) {
  const seen = new Set();
  const eligible = (card.observations || []).filter((o) => {
    const date = Date.parse(o.date),
      age = (now - date) / 86400000;
    const key = o.url?.trim() || `${o.source}|${o.date}|${o.amount}|${o.type}`;
    if (
      seen.has(key) ||
      !Number.isFinite(+o.amount) ||
      +o.amount <= 0 ||
      !Number.isFinite(date) ||
      age < -1 ||
      age > 90 ||
      o.type === "aggregate" ||
      !["asking", "sold"].includes(o.type) ||
      o.currency !== "EUR" ||
      o.cardKey !== cardKey(card) ||
      o.condition !== card.condition ||
      !o.matchConfirmed
    )
      return false;
    seen.add(key);
    return true;
  });
  // Ne jamais mélanger des prix demandés avec des transactions, ni différents marchés.
  const groups = new Map();
  for (const o of eligible) {
    const k = `${o.source}|${o.type}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(o);
  }
  const ranked = [...groups.values()].sort(
    (a, b) =>
      (b.length >= 3) - (a.length >= 3) ||
      (b[0].type === "sold") - (a[0].type === "sold") ||
      b.length - a.length,
  );
  const group = ranked[0] || [];
  if (group.length < 3)
    return {
      available: false,
      count: group.length,
      eligible: eligible.length,
      reason:
        "Au moins 3 comparables récents du même marché et du même type sont nécessaires.",
    };
  const sorted = group.map((o) => +o.amount).sort((a, b) => a - b),
    med = quantile(sorted, 0.5);
  const retained = group.filter(
    (o) => +o.amount >= med * 0.25 && +o.amount <= med * 4,
  );
  if (retained.length < 3)
    return {
      available: false,
      count: retained.length,
      reason: "Échantillon insuffisant après retrait des valeurs atypiques.",
    };
  const values = retained.map((o) => +o.amount).sort((a, b) => a - b),
    low = quantile(values, 0.25),
    high = quantile(values, 0.75),
    median = quantile(values, 0.5);
  const prices = { fast: low, balanced: median, high };
  return {
    available: true,
    count: values.length,
    excluded: eligible.length - values.length,
    low,
    high,
    median,
    price: Math.round(prices[card.strategy || "balanced"] * 100) / 100,
    source: retained[0].source,
    type: retained[0].type,
    confidence:
      values.length >= 8 && high / Math.max(low, 0.01) < 1.5
        ? "Modérée"
        : "Faible",
    observations: retained,
  };
}
export function quantile(a, q) {
  const p = (a.length - 1) * q,
    i = Math.floor(p);
  return a[i] + (a[Math.ceil(p)] - a[i]) * (p - i);
}
export function cardKey(c) {
  return [
    c.catalogId || `${c.name}|${c.number}|${c.set}`,
    c.language,
    c.variant,
  ].join("::");
}
export function readyErrors(c) {
  const errors = [];
  if (!c.name.trim() || !c.number.trim() || !c.identityConfirmed)
    errors.push("Confirmer le nom et le numéro de la carte.");
  if (
    !c.photos.some((p) => p.side === "front") ||
    !c.photos.some((p) => p.side === "back")
  )
    errors.push("Ajouter les photos recto et verso.");
  if (!c.condition || !c.conditionConfirmed)
    errors.push("Vérifier et confirmer l’état.");
  if (!Number.isFinite(+c.price) || +c.price <= 0)
    errors.push("Choisir un prix positif.");
  return errors;
}
export function generateListing(c) {
  return {
    title: [
      `Pokémon ${c.name} ${c.number}`,
      c.set.trim(),
      c.language.toUpperCase(),
      c.variant.trim(),
    ]
      .filter(Boolean)
      .join(" — "),
    description: [
      `Carte Pokémon ${c.name} — ${c.number}.`,
      c.set.trim() ? `Extension : ${c.set}.` : "",
      `Langue : ${c.language.toUpperCase()}.${c.variant.trim() ? ` Variante : ${c.variant}.` : ""}`,
      `État évalué par le vendeur : ${CONDITIONS[c.condition] || c.condition}.`,
      `Défauts constatés : ${[...c.defects, c.defectNotes].filter(Boolean).join(", ") || "aucun défaut signalé après vérification du vendeur"}.`,
      "Les photos montrent l’exemplaire proposé à la vente.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
export function safeUrl(value, host) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      (!host || u.hostname === host || u.hostname.endsWith("." + host))
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function parseOCR(text) {
  const match = text.match(
    /\b([A-Z]{0,4}\d{1,3})\s*\/\s*([A-Z]{0,4}\d{1,3})\b/i,
  );
  return {
    number: match ? `${match[1]}/${match[2]}` : "",
    lines: text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  };
}

export function listingFingerprint(c) {
  return JSON.stringify([
    c.name,
    c.number,
    c.set,
    c.language,
    c.variant,
    c.condition,
    c.identityConfirmed,
    c.conditionConfirmed,
    c.defects,
    c.defectNotes,
    String(c.price),
    c.photos.map((p) => p.id),
  ]);
}

export function migrateCard(c) {
  // Keep the original snapshot: a previously stale draft must stay stale.
  try {
    const facts = JSON.parse(c.listingFingerprint);
    if (Array.isArray(facts) && facts.length === 14)
      c.listingFingerprint = JSON.stringify([...facts.slice(0, 11), facts[13]]);
  } catch {
    // Missing or invalid fingerprints remain subject to the usual checks.
  }
  delete c.packaging;
  delete c.vintedCondition;
  return c;
}

export const normalizeNumber = (value) =>
  String(value || "")
    .split("/")[0]
    .trim()
    .toUpperCase()
    .replace(/(^|[^0-9])0+(?=[0-9])/g, "$1");
