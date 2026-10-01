import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveReference,
  namesInText,
  detectedNumber,
  photoReading,
  incompleteReadingReason,
} from "../src/recognition.js";
const card = (id, name, number, set, total) => ({
  id,
  name,
  localId: number,
  set: { id, name: set, cardCount: { official: total } },
});
test("un numéro mal lu ne supprime pas le nom reconnu", () => {
  const reading = photoReading([base], "Dracaufeu PV 120\n5/102");
  assert.equal(reading.name, "Dracaufeu");
  assert.equal(reading.number, "5/102");
  assert.deepEqual(reading.matches, []);
  assert.equal(
    photoReading(
      [base, card("base1-5", "Reptincel", "5", "Base", 102)],
      "Dracaufeu\nÉvolue de Reptincel\n4/102",
    ).name,
    "Dracaufeu",
  );
});
test("un séparateur perdu par l’OCR est restauré uniquement avec les métadonnées concordantes, sans utiliser une année", () => {
  assert.equal(photoReading([base], "Dracaufeu\n©1999\n4102").number, "4/102");
  assert.equal(photoReading([base], "Dracaufeu\n4103").number, "");
  assert.equal(
    photoReading([{ ...base, set: undefined }], "Dracaufeu\n4102").number,
    "",
  );
  assert.equal(
    photoReading(
      [card("x-20", "Dracaufeu", "20", "Test", 24)],
      "Dracaufeu\n©2024",
    ).number,
    "",
  );
});
test("une erreur OCR de lettre est rapprochée du catalogue uniquement avec un numéro concordant", () => {
  const reading = photoReading([base], "Dracautfeu PV 120\n4/1O2");
  assert.equal(reading.name, "Dracaufeu");
  assert.equal(reading.number, "4/102");
  assert.equal(reading.matches[0].id, base.id);
  assert.equal(photoReading([base], "Dracautfeu\n5/102").name, "");
  const similar = [
    card("x-4", "Mewna", "4", "Test", 102),
    card("y-4", "Mewno", "4", "Test", 102),
  ];
  assert.equal(photoReading(similar, "Mewne\n4/102").name, "");
});
test("le numéro du bas est préféré aux nombres des attaques ; les totaux de sous-séries restent valides", () => {
  assert.equal(detectedNumber("Dracaufeu\nAttaque 10/20\n4 / 1O2"), "4/102");
  assert.equal(detectedNumber("Mew\nTG01/TG30\n©2024"), "TG01/TG30");
  assert.equal(detectedNumber("Mew\nHolo/Holo"), "");
  const subset = card("set-TG01", "Mew", "TG01", "Test", 185);
  assert.equal(
    resolveReference([subset], { name: "Mew", number: "TG01/TG30" }).card?.id,
    subset.id,
  );
  const mismatchedTotal = resolveReference([base], {
    name: "Dracaufeu",
    number: "4/99",
  });
  assert.equal(mismatchedTotal.card, null);
  assert.equal(mismatchedTotal.identity.name, "Dracaufeu");
});
test("l’échec indique le champ absent ou le rapprochement catalogue, sans attribuer un reflet à la photo", () => {
  assert.match(
    incompleteReadingReason({ name: "Dracaufeu" }),
    /Nom lu.*numéro reste illisible/,
  );
  assert.match(
    incompleteReadingReason({ number: "4/102" }),
    /Numéro lu.*nom n’a pas été reconnu/,
  );
  assert.match(
    resolveReference([], { name: "Dracaufeu", number: "4/102" }).reason,
    /Référence exacte non retrouvée/,
  );
});
const base = card("base1-4", "Dracaufeu", "4", "Set de Base", 102);
const reprint = card("base2-4", "Dracaufeu", "4", "Réédition", 102);

test("numéro complet, numéro sans total et promo identifient une référence unique", () => {
  for (const number of ["4/102", "004"])
    assert.equal(
      resolveReference([base], { name: "Dracaufeu", number }).card?.id,
      base.id,
    );
  const promo = card("promo-123", "Mew", "SVP123", "Promos", 0);
  assert.equal(
    resolveReference([promo], { text: "Mew\nSVP123", number: "SVP123" }).card
      ?.id,
    promo.id,
  );
  assert.equal(detectedNumber("Mew\nSVP123"), "SVP123");
});
test("l’extension lue départage automatiquement deux éditions avec le même numéro", () => {
  assert.equal(
    resolveReference([base, reprint], {
      number: "4/102",
      text: "Dracaufeu\nSet de Base\n4/102",
    }).card?.id,
    base.id,
  );
  assert.equal(
    resolveReference([base, reprint], {
      number: "4/102",
      name: "Dracaufeu",
      set: "Réédition",
    }).card?.id,
    reprint.id,
  );
});
test("suffixe ex et noms courts sont distingués du nom de base et de mots plus longs", () => {
  const ex = card("ex-4", "Dracaufeu ex", "4", "Test", 102);
  assert.deepEqual(
    namesInText([base, ex], "Dracaufeu ex HP 300\n4/102").map((c) => c.id),
    [ex.id],
  );
  assert.equal(
    namesInText([card("mew", "Mew", "1", "Test", 10)], "Mewtwo HP 300").length,
    0,
  );
});
test("une édition inconnue conserve le nom et le numéro sans choisir une fiche catalogue", () => {
  for (const set of ["", "Autre"]) {
    const resolution = resolveReference([base, reprint], {
      name: "Dracaufeu",
      number: "4/102",
      set,
    });
    assert.equal(resolution.card, null);
    assert.deepEqual(resolution.identity, {
      name: "Dracaufeu",
      number: "4/102",
    });
    assert.match(resolution.reason, /vous pouvez préparer l’annonce/);
    assert.doesNotMatch(resolution.reason, /Reprenez/);
  }
  assert.equal(
    resolveReference([base, reprint], { name: "Dracaufeu" }).identity,
    null,
  );
  assert.equal(
    resolveReference([base, reprint], { name: "Dracaufeu", number: "5/102" })
      .identity,
    null,
  );
});
test("ambiguïtés, contradictions et catalogue incomplet ne valident pas une carte arbitraire", () => {
  assert.equal(
    resolveReference([base, reprint], { name: "Dracaufeu", number: "4/102" })
      .card,
    null,
  );
  assert.equal(
    resolveReference([base], { name: "Dracaufeu", number: "5/102" }).card,
    null,
  );
  assert.equal(
    resolveReference([base], { name: "Dracaufeu", number: "4/99" }).card,
    null,
  );
  assert.equal(
    resolveReference([base], {
      name: "Dracaufeu",
      number: "4/102",
      set: "Autre",
    }).card,
    null,
  );
  assert.equal(
    resolveReference([base], { name: "Dracaufeu", number: "4/102" }, false)
      .card,
    null,
  );
  assert.equal(resolveReference([base], { name: "Dracaufeu" }).card, null);
});
