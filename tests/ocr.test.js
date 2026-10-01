import { test } from "node:test";
import assert from "node:assert/strict";
import { readCardPhoto } from "../src/ocr.js";

const cards = [{ id: "base1-4", name: "Dracaufeu", localId: "4" }];
const views = Object.fromEntries(
  [
    "full",
    "header",
    "footer",
    "referenceLeft",
    "referenceRight",
    "contrast",
    "clockwise",
    "anticlockwise",
  ].map((key) => [key, { key, height: 1100 }]),
);
const worker = (texts) => ({
  async setParameters() {},
  async recognize(view) {
    return { data: { text: texts[view.key] || "", confidence: 80 } };
  },
});

test("une lecture du numéro manquant est relancée automatiquement en conservant le nom", async () => {
  const reading = await readCardPhoto(
    worker({ full: "Dracaufeu PV 120", footer: "4/102" }),
    views,
    cards,
  );
  assert.equal(reading.name, "Dracaufeu");
  assert.equal(reading.number, "4/102");
  assert.equal(reading.matches[0].id, "base1-4");
  assert.equal(reading.diagnostics.passes, 2);
});
test("les deux zones récupèrent une identité absente de la première lecture", async () => {
  const reading = await readCardPhoto(
    worker({ full: "Carte Pokémon", header: "Dracautfeu", footer: "4/1O2" }),
    views,
    cards,
  );
  assert.equal(reading.name, "Dracaufeu");
  assert.equal(reading.number, "4/102");
  assert.equal(reading.diagnostics.passes, 3);
});
test("une photo illisible termine les tentatives sans créer une identité", async () => {
  const reading = await readCardPhoto(worker({}), views, cards);
  assert.equal(reading.name, "");
  assert.equal(reading.number, "");
  assert.deepEqual(reading.matches, []);
  assert.equal(reading.diagnostics.passes, 8);
});
test("le titre principal est préféré à la pré-évolution et aux mots du cartouche", async () => {
  const dictionary = [
    ...cards,
    { id: "base1-5", name: "Reptincel", localId: "5" },
    { id: "trainer-136", name: "Carte", localId: "136" },
  ];
  const w = worker({
    full: "Évolution de Reptincel\nPlacez sur la carte\nDracautfeu PV 120\n4/102",
  });
  w.recognize = async () => ({
    data: {
      text: "Évolution de Reptincel\nPlacez sur la carte\nDracautfeu PV 120\n4/102",
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                { text: "Évolution de Reptincel", bbox: { y0: 10, y1: 30 } },
                { text: "Placez sur la carte", bbox: { y0: 10, y1: 30 } },
                { text: "Dracautfeu PV 120", bbox: { y0: 50, y1: 100 } },
                { text: "4/102", bbox: { y0: 1000, y1: 1040 } },
              ],
            },
          ],
        },
      ],
    },
  });
  const result = await readCardPhoto(w, views, dictionary);
  assert.equal(result.name, "Dracaufeu");
  assert.equal(result.number, "4/102");
  assert.equal(result.diagnostics.passes, 1);
});
