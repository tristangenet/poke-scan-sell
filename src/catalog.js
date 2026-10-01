import { normalizeNumber } from "./domain.js";
import { namesInText, detectedNumber } from "./recognition.js";
const API = "https://api.tcgdex.net/v2";
async function get(path) {
  const r = await fetch(API + path, { signal: AbortSignal.timeout(20000) });
  if (!r.ok)
    throw new Error(
      `Catalogue indisponible (${r.status}). Utilisez la saisie manuelle.`,
    );
  return r.json();
}
export async function searchCards(name, number, language = "fr") {
  const params = new URLSearchParams();
  if (name.trim()) params.set("name", name.trim());
  if (number.trim()) params.set("localId", number.split("/")[0].trim());
  if (!params.size) throw new Error("Indiquez un nom ou un numéro.");
  const result = await get(`/${language}/cards?${params}`);
  return result
    .filter(
      (c) =>
        (!number.trim() ||
          normalizeNumber(c.localId) === normalizeNumber(number)) &&
        !/^A[0-9]/.test(c.id),
    )
    .slice(0, 24);
}
export const getCard = (id, language = "fr") =>
  get(`/${language}/cards/${encodeURIComponent(id)}`);
export async function recognizePhoto(data, language, onProgress) {
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
    const result = await worker.recognize(data);
    const number = detectedNumber(result.data.text);
    let cards = [];
    let warning = "";
    try {
      cards = await get(`/${language}/cards`);
    } catch {
      warning =
        "Texte lu, mais catalogue indisponible. Réessayez la recherche plus tard.";
    }
    const matches = namesInText(cards, result.data.text).filter(
      (c) =>
        !/^A[0-9]/.test(c.id) &&
        (!number || normalizeNumber(c.localId) === normalizeNumber(number)),
    );
    return {
      text: result.data.text,
      number,
      matches: matches.slice(0, 24),
      truncated: matches.length > 24,
      warning,
    };
  } finally {
    await worker.terminate();
  }
}
