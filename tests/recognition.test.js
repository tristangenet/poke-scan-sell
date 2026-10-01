import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveReference,
  namesInText,
  detectedNumber,
} from "../src/recognition.js";
const card = (id, name, number, set, total) => ({
  id,
  name,
  localId: number,
  set: { id, name: set, cardCount: { official: total } },
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
