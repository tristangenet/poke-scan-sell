import { test } from "node:test";
import assert from "node:assert/strict";
import {
  estimate,
  cardKey,
  readyErrors,
  generateListing,
  parseOCR,
  safeUrl,
} from "../src/domain.js";
const card = {
  catalogId: "base1-4",
  name: "Dracaufeu",
  number: "4/102",
  set: "Base",
  language: "fr",
  variant: "Holo",
  condition: "EX",
  strategy: "balanced",
  photos: [],
  observations: [],
  defects: [],
  packaging: "Protection rigide",
};
const now = Date.parse("2026-10-01T12:00:00Z");
function obs(amount, extra = {}) {
  return {
    amount,
    source: "Vinted",
    type: "asking",
    date: "2026-09-30",
    currency: "EUR",
    cardKey: cardKey(card),
    condition: "EX",
    matchConfirmed: true,
    url: `https://example.org/${amount}`,
    ...extra,
  };
}
test("estimation avec comparables homogènes et exclusion des variantes, états et dates incompatibles", () => {
  const c = {
    ...card,
    observations: [
      obs(10),
      obs(12),
      obs(14),
      obs(100, { condition: "NM" }),
      obs(150, { cardKey: "autre" }),
      obs(80, { date: "2020-01-01" }),
      obs(30, { date: "2027-01-01" }),
      obs(33, { currency: "USD" }),
      obs(12),
    ],
  };
  const e = estimate(c, now);
  assert.equal(e.count, 3);
  assert.equal(e.price, 12);
  assert.equal(e.low, 11);
  assert.equal(e.high, 13);
});
test("prix demandés, ventes réalisées et marchés distincts ne sont pas mélangés", () => {
  assert.equal(
    estimate(
      {
        ...card,
        observations: [
          obs(10),
          obs(12, { source: "Cardmarket" }),
          obs(14, { type: "sold" }),
        ],
      },
      now,
    ).available,
    false,
  );
});
test("agrégat seul ne donne jamais une estimation selon état", () => {
  assert.equal(
    estimate(
      {
        ...card,
        observations: [
          obs(100, { type: "aggregate" }),
          obs(200, { type: "aggregate" }),
          obs(300, { type: "aggregate" }),
        ],
      },
      now,
    ).available,
    false,
  );
});
test("une valeur extrême ne tire pas le prix conseillé", () => {
  const e = estimate(
    { ...card, observations: [obs(10), obs(11), obs(12), obs(1000)] },
    now,
  );
  assert.equal(e.count, 3);
  assert.equal(e.price, 11);
});
test("une source de ventes avec échantillon insuffisant ne masque pas une source de prix demandés suffisante", () => {
  assert.equal(
    estimate(
      {
        ...card,
        observations: [obs(10), obs(12), obs(14), obs(5, { type: "sold" })],
      },
      now,
    ).available,
    true,
  );
});
test("génération requiert identité état photos et prix", () => {
  assert.ok(readyErrors(card).length >= 4);
  const c = {
    ...card,
    identityConfirmed: true,
    conditionConfirmed: true,
    photos: [{ side: "front" }, { side: "back" }],
    price: 12,
    vintedCondition: "Bon état",
  };
  assert.equal(readyErrors(c).length, 0);
  assert.match(generateListing(c).description, /Protection rigide/);
  assert.doesNotMatch(generateListing(c).description, /authentique/i);
});
test("OCR conserve préfixes et numéro complet", () => {
  assert.equal(parseOCR("Pikachu\nTG01/TG30").number, "TG01/TG30");
});
test("liens externes sécurisés et domaine Vinted strict", () => {
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(
    safeUrl("https://vinted.fr.evil.test/items/1", "vinted.fr"),
    null,
  );
  assert.equal(
    safeUrl("https://www.vinted.fr/items/1", "vinted.fr"),
    "https://www.vinted.fr/items/1",
  );
});

test("une annonce est périmée après changement d’état, prix ou photo", async () => {
  const { listingFingerprint } = await import("../src/domain.js");
  const c = { ...card, price: 12, photos: [{ id: "one", side: "front" }] };
  const original = listingFingerprint(c);
  assert.notEqual(listingFingerprint({ ...c, price: 13 }), original);
  assert.notEqual(listingFingerprint({ ...c, condition: "NM" }), original);
  assert.notEqual(
    listingFingerprint({ ...c, photos: [{ id: "two", side: "front" }] }),
    original,
  );
  assert.equal(
    listingFingerprint({ ...c, description: "texte corrigé" }),
    original,
  );
});
