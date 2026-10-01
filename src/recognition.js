import { normalize, normalizeNumber } from "./domain.js";

const words = (text) =>
  String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const contains = (text, phrase) =>
  Boolean(words(phrase)) && ` ${words(text)} `.includes(` ${words(phrase)} `);

// Prefer names read in the title area; retain edition suffixes such as ex/GX.
export function namesInText(cards, text) {
  const lines = String(text)
    .split("\n")
    .filter((l) => l.trim());
  const header = lines.slice(0, 8).join(" ");
  const named = (scope) =>
    cards.filter(
      (c) => normalize(c.name).length >= 3 && contains(scope, c.name),
    );
  const matches = named(header).length ? named(header) : named(text);
  return matches.filter(
    (c) =>
      !matches.some(
        (other) =>
          words(other.name) !== words(c.name) && contains(other.name, c.name),
      ),
  );
}

const collectorToken = (value) => {
  const match = String(value).match(/^([A-Z]{0,5}?)([0-9OIl]{1,3})$/i);
  return match && (!match[1] || /\d/.test(match[2]))
    ? match[1].toUpperCase() +
        match[2].replace(/[O]/gi, "0").replace(/[Il]/gi, "1")
    : "";
};
export function detectedNumber(text) {
  const full = [
    ...String(text).matchAll(
      /\b([A-Z]{0,5}?[0-9OIl]{1,3})\s*[/／|]\s*([A-Z]{0,5}?[0-9OIl]{1,3})\b/gi,
    ),
  ].filter((m) => collectorToken(m[1]) && collectorToken(m[2]));
  // Prefer the collector reference at the bottom, rather than a ratio in an attack.
  if (full.length) {
    const match = full.at(-1);
    return `${collectorToken(match[1])}/${collectorToken(match[2])}`;
  }
  // Standalone collector numbers, including promos, at the bottom of the OCR.
  const lines = String(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const isolated = lines
    .slice(-6)
    .filter((l) => /^(?:[A-Z]{1,5})?\d{1,3}\s*[★☆●◆]?$/i.test(l))
    .map((l) => l.replace(/[★☆●◆\s]/g, ""));
  return isolated.length === 1 ? isolated[0] : "";
}

function editDistance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1] + 1,
        row[j] + 1,
        row[j - 1] + (a[i - 1] !== b[j - 1]),
      );
    row = next;
  }
  return row[b.length];
}
function approximateNames(cards, text) {
  const lines = String(text)
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, 4);
  const scored = cards.map((c) => {
    const name = normalize(c.name);
    let distance = Infinity;
    if (name.length < 5) return { card: c, distance };
    for (const line of lines) {
      const tokens = words(line).split(" ");
      for (let i = 0; i < tokens.length; i++)
        for (let n = 1; n <= 4 && i + n <= tokens.length; n++) {
          const sample = tokens.slice(i, i + n).join("");
          if (Math.abs(sample.length - name.length) <= 1)
            distance = Math.min(distance, editDistance(sample, name));
        }
    }
    return { card: c, distance };
  });
  const best = Math.min(...scored.map((c) => c.distance));
  if (best > 1) return [];
  const matched = scored.filter((c) => c.distance === best).map((c) => c.card);
  return matched.filter(
    (c) =>
      !matched.some(
        (other) =>
          normalize(other.name) !== normalize(c.name) &&
          contains(other.name, c.name),
      ),
  );
}

export function photoReading(
  cards,
  text,
  { headerText = "", numberText = "" } = {},
) {
  // Keep the name independently of the number. A misread number must not erase it.
  let names = namesInText(cards, headerText || text);
  let number = detectedNumber(numberText) || detectedNumber(text);
  if (!number && names.length) {
    const footer = numberText || String(text).split("\n").slice(-8).join("\n");
    const joined = new Set(
      [...footer.matchAll(/\b\d{4,6}\b/g)]
        .map((m) => m[0])
        .filter((n) => !/^(19|20)\d{2}$/.test(n)),
    );
    const possible = new Set();
    for (const c of names) {
      const total = c.set?.cardCount?.official;
      if (!/^\d+$/.test(c.localId) || !Number.isInteger(total) || total < 1)
        continue;
      const local = normalizeNumber(c.localId);
      if (
        [local, local.padStart(2, "0"), local.padStart(3, "0")].some((n) =>
          joined.has(n + total),
        )
      )
        possible.add(`${c.localId}/${total}`);
    }
    // Restore a dropped slash only for a unique name/number/count combination.
    if (possible.size === 1) number = [...possible][0];
  }
  let correctedName = false;
  if (!names.length && number) {
    names = approximateNames(
      cards.filter(
        (c) => normalizeNumber(c.localId) === normalizeNumber(number),
      ),
      headerText || text,
    );
    correctedName = names.length > 0;
  }
  const matches = names.filter(
    (c) => !number || normalizeNumber(c.localId) === normalizeNumber(number),
  );
  const numberedNames = [...new Set(matches.map((c) => c.name))];
  const distinct = [...new Set(names.map((c) => c.name))];
  return {
    name:
      numberedNames.length === 1
        ? numberedNames[0]
        : distinct.length === 1
          ? distinct[0]
          : "",
    number,
    matches,
    correctedName,
  };
}

export function incompleteReadingReason({ name = "", number = "" }) {
  if (name && number)
    return `Nom et numéro lus : ${name} ${number}. Référence exacte non retrouvée dans le catalogue ; vous pouvez préparer l’annonce sans édition ni prix catalogue.`;
  if (name)
    return `Nom lu : ${name}. Le numéro reste illisible après les lectures automatiques.`;
  if (number)
    return `Numéro lu : ${number}. Le nom n’a pas été reconnu après les lectures automatiques.`;
  return "Les lectures automatiques n’ont reconnu ni le nom ni le numéro. Vérifiez que le recto est cadré de près et à l’endroit.";
}

export function resolveReference(cards, evidence, complete = true) {
  const unique = [...new Map(cards.map((c) => [c.id, c])).values()];
  const number = normalizeNumber(evidence.number);
  const total = String(evidence.number || "").split("/")[1];
  const names = evidence.name
    ? unique.filter((c) => normalize(c.name) === normalize(evidence.name))
    : namesInText(unique, evidence.text || "");
  let matches = names;
  if (number)
    matches = matches.filter((c) => normalizeNumber(c.localId) === number);
  // A shared name and collector number are enough for a listing, even when
  // the exact catalogue reference (and therefore its price) remains unknown.
  const identity =
    number &&
    matches.length &&
    new Set(matches.map((c) => normalize(c.name))).size === 1
      ? { name: matches[0].name, number: String(evidence.number).trim() }
      : null;
  if (!complete)
    return {
      card: null,
      identity,
      reason:
        "Lecture conservée. Certaines références catalogue sont indisponibles ; aucun prix catalogue n’a été choisi.",
    };
  // Prefixed totals describe a subset (TG, SV, etc.), not the set's official count.
  if (total && /^\d+$/.test(total))
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
      identity,
      reason: identity
        ? "Nom et numéro reconnus. L’édition est facultative : vous pouvez préparer l’annonce."
        : incompleteReadingReason(evidence),
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
    identity,
    reason: identity
      ? "Nom et numéro reconnus. L’édition est facultative : vous pouvez préparer l’annonce."
      : incompleteReadingReason(evidence),
  };
}
