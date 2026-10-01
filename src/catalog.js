import { normalizeNumber } from "./domain.js";
import { createOCRViews, readCardPhoto } from "./ocr.js";
import { resolveReference } from "./recognition.js";
import {
  createCatalogueClient,
  settleLimited,
  CatalogueError,
} from "./catalog-client.js";
const client = createCatalogueClient();
const get = (path, options) => client.get(path, options);
const validBrief = (c) =>
  c &&
  typeof c.id === "string" &&
  typeof c.name === "string" &&
  typeof c.localId === "string";
export async function searchCards(name, number, language = "fr") {
  const params = new URLSearchParams();
  if (name.trim()) params.set("name", name.trim());
  if (number.trim()) params.set("localId", number.split("/")[0].trim());
  if (!params.size) throw new Error("Indiquez un nom ou un numéro.");
  const result = await get(`/${language}/cards?${params}`);
  if (!Array.isArray(result))
    throw new CatalogueError("Réponse catalogue inattendue pour la recherche.");
  return result
    .filter(validBrief)
    .filter(
      (c) =>
        (!number.trim() ||
          normalizeNumber(c.localId) === normalizeNumber(number)) &&
        !/^A[0-9]/.test(c.id),
    );
}
export async function getCard(id, language = "fr", options) {
  const result = await get(
    `/${language}/cards/${encodeURIComponent(id)}`,
    options,
  );
  if (
    !validBrief(result) ||
    result.id !== id ||
    !result.set?.name ||
    !Number.isFinite(result.set?.cardCount?.official)
  ) {
    throw new CatalogueError(
      "La fiche catalogue est indisponible ou incomplète.",
    );
  }
  return result;
}

export async function resolveCatalogue(
  candidates,
  evidence,
  language = "fr",
  onProgress = () => {},
) {
  const unique = [
    ...new Map(candidates.filter(validBrief).map((c) => [c.id, c])).values(),
  ];
  if (!unique.length) return resolveReference([], evidence);
  const metadata = new Map();
  let serviceError = "";
  onProgress("Recherche de la référence…");
  try {
    const sets = await get(`/${language}/sets`);
    if (!Array.isArray(sets))
      throw new CatalogueError(
        "Réponse catalogue inattendue pour les extensions.",
      );
    const byId = new Map(
      sets
        .filter(
          (s) =>
            typeof s.name === "string" &&
            Number.isFinite(s.cardCount?.official),
        )
        .map((s) => [s.id, s]),
    );
    for (const c of unique) {
      const suffix = `-${c.localId}`;
      const setId = c.id.endsWith(suffix)
        ? c.id.slice(0, -suffix.length)
        : c.id.slice(0, c.id.lastIndexOf("-"));
      const set = byId.get(c.set?.id || setId);
      if (set) metadata.set(c.id, { ...c, set });
    }
  } catch (error) {
    serviceError = error.message;
  }
  const missing = unique.filter((c) => !metadata.has(c.id));
  // A name alone cannot distinguish hundreds of editions. Keep it without requesting every card.
  if (missing.length > 10 && !evidence.number && !evidence.set) {
    return {
      card: null,
      reason:
        "Nom reconnu. Le numéro n’a pas été lu : reprenez le bas du recto bien net.",
      warning: serviceError,
    };
  }
  if (missing.length) {
    onProgress("Vérification des références…");
    const results = await settleLimited(missing, (c) =>
      getCard(c.id, language),
    );
    results.forEach((r, index) => {
      if (r.status === "fulfilled") metadata.set(missing[index].id, r.value);
      else serviceError = r.reason.message;
    });
  }
  const complete = unique.every((c) => metadata.has(c.id));
  const resolution = resolveReference(
    [...metadata.values()],
    evidence,
    complete,
  );
  if (!complete)
    return {
      ...resolveReference(unique, evidence, false),
      reason: `${metadata.size}/${unique.length} références vérifiées. ${serviceError || "Certaines fiches restent indisponibles."} Le nom et le numéro lus sont conservés.`,
    };
  if (!resolution.card) return resolution;
  onProgress("Chargement de la carte identifiée…");
  try {
    return { ...resolution, card: await getCard(resolution.card.id, language) };
  } catch (error) {
    // Set + card briefs already establish the reference. Pricing/variants can be unavailable independently.
    return {
      ...resolution,
      reason:
        "Carte identifiée automatiquement. Les variantes et le prix catalogue n’ont pas pu être chargés.",
      warning: error.message,
    };
  }
}

export async function recognizePhoto(
  data,
  language,
  onProgress,
  onStage = () => {},
) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(language === "fr" ? "fra" : "eng", 1, {
    workerPath: new URL("/ocr/worker.min.js", location.origin).href,
    corePath: new URL("/ocr", location.origin).href,
    langPath: new URL("/ocr", location.origin).href,
    workerBlobURL: false,
    logger: (m) => {
      if (m.status === "recognizing text")
        onProgress(Math.round(m.progress * 100));
    },
  });
  try {
    let cards = [];
    let warning = "";
    try {
      cards = await get(`/${language}/cards`);
      if (!Array.isArray(cards))
        throw new CatalogueError("Réponse catalogue inattendue.");
    } catch {
      warning =
        "Texte lu, mais catalogue indisponible. Réessayez la recherche plus tard.";
    }
    // Set counts allow a missing OCR slash (e.g. 4102) to be restored safely.
    try {
      const sets = await get(`/${language}/sets`);
      const byId = new Map(
        (Array.isArray(sets) ? sets : []).map((s) => [s.id, s]),
      );
      cards = cards.filter(validBrief).map((c) => {
        const suffix = `-${c.localId}`;
        const setId = c.id.endsWith(suffix)
          ? c.id.slice(0, -suffix.length)
          : c.id.slice(0, c.id.lastIndexOf("-"));
        return { ...c, set: c.set || byId.get(setId) };
      });
    } catch {
      // Ordinary readable references do not require this optional correction.
    }
    const views = await createOCRViews(data);
    const reading = await readCardPhoto(
      worker,
      views,
      cards.filter(validBrief).filter((c) => !/^A[0-9]/.test(c.id)),
      onStage,
    );
    return {
      ...reading,
      warning,
    };
  } finally {
    await worker.terminate();
  }
}
