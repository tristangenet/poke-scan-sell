import { normalize, normalizeNumber } from "./domain.js";

const words = (text) =>
  String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const contains = (text, phrase) =>
  Boolean(words(phrase)) && ` ${words(text)} `.includes(` ${words(phrase)} `);

// Prefer names read in the title area; retain edition suffixes such as ex/GX.
export function namesInText(cards, text) {
  const lines = String(text)
    .split("\n")
    .filter((l) => l.trim());
  const header = lines.slice(0, 4).join(" ");
  const named = (scope) =>
    cards.filter(
      (c) => normalize(c.name).length >= 3 && contains(scope, c.name),
    );
  const matches = named(header).length ? named(header) : named(text);
  return matches.filter(
    (c) =>
      !matches.some(
        (other) =>
          normalize(other.name) !== normalize(c.name) &&
          contains(other.name, c.name),
      ),
  );
}

export function detectedNumber(text) {
  const full = String(text).match(
    /\b([A-Z]{0,5}\d{1,3})\s*\/\s*([A-Z]{0,5}\d{1,3})\b/i,
  );
  if (full) return `${full[1]}/${full[2]}`;
  // Standalone collector numbers, including promos, at the bottom of the OCR.
  const lines = String(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const isolated = lines
    .slice(-3)
    .filter((l) => /^(?:[A-Z]{1,5})?\d{1,3}$/i.test(l));
  return isolated.length === 1 ? isolated[0] : "";
}

export function resolveReference(cards, evidence, complete = true) {
  if (!complete)
    return {
      card: null,
      reason:
        "Catalogue incomplet : réessayez la reconnaissance avant d’identifier la carte.",
    };
  const unique = [...new Map(cards.map((c) => [c.id, c])).values()];
  const number = normalizeNumber(evidence.number);
  const total = String(evidence.number || "").split("/")[1];
  const names = evidence.name
    ? unique.filter((c) => normalize(c.name) === normalize(evidence.name))
    : namesInText(unique, evidence.text || "");
  let matches = names;
  if (number)
    matches = matches.filter((c) => normalizeNumber(c.localId) === number);
  if (total)
    matches = matches.filter(
      (c) => Number(c.set?.cardCount?.official) === Number(total),
    );
  const extension = evidence.set
    ? matches.filter(
        (c) =>
          normalize(c.set?.name || "") === normalize(evidence.set) ||
          normalize(c.set?.id || "") === normalize(evidence.set),
      )
    : matches.filter(
        (c) =>
          (normalize(c.set?.name || "").length >= 4 &&
            contains(evidence.text || "", c.set.name)) ||
          (normalize(c.set?.id || "").length >= 3 &&
            contains(evidence.text || "", c.set.id)),
      );
  if (evidence.set && !extension.length)
    return {
      card: null,
      reason:
        "Le nom, le numéro et l’extension lus ne concordent pas. Reprenez une photo nette du recto.",
    };
  if (extension.length) matches = extension;
  if (matches.length === 1 && (number || extension.length)) {
    return {
      card: matches[0],
      reason:
        "Carte identifiée automatiquement : nom et référence concordants.",
    };
  }
  return {
    card: null,
    reason:
      matches.length > 1
        ? "Le scan ne distingue pas encore l’édition. Reprenez le recto avec le numéro, le symbole d’extension et les mentions du bas bien nets."
        : "Identification incomplète : photographiez le nom et le numéro de la carte sans reflet.",
  };
}
