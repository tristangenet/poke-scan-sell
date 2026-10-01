import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, validatePhotos } from "../server/vision.js";
const photos = [
  { side: "front", data: "data:image/png;base64,YQ==" },
  { side: "back", data: "data:image/png;base64,YQ==" },
];
test("le serveur exige recto et verso et refuse une image distante", () => {
  assert.equal(validatePhotos({ photos }).length, 2);
  assert.throws(() => validatePhotos({ photos: [photos[0]] }));
  assert.throws(() =>
    validatePhotos({
      photos: [
        photos[0],
        { side: "back", data: "https://example.org/private" },
      ],
    }),
  );
});
test("requête IA structurée sans conservation et sans clé côté client", async () => {
  let payload;
  const data = {
    name: "Pikachu",
    number: "1/2",
    set: "",
    variant: "",
    condition: "unknown",
    confidence: "low",
    defects: [],
    warnings: ["Reflet"],
    photosSufficient: false,
  };
  const result = await analyze(
    photos,
    { key: "server-test-key", model: "test-model" },
    async (url, options) => {
      payload = JSON.parse(options.body);
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.equal(options.headers.Authorization, "Bearer server-test-key");
      return {
        ok: true,
        json: async () => ({
          status: "completed",
          output: [
            { content: [{ type: "output_text", text: JSON.stringify(data) }] },
          ],
        }),
      };
    },
  );
  assert.equal(payload.store, false);
  assert.equal(payload.text.format.strict, true);
  assert.equal(
    payload.input[0].content.filter((c) => c.type === "input_image").length,
    2,
  );
  assert.equal(result.photosSufficient, false);
});
test("analyse incomplète ou refusée ne produit pas un résultat inventé", async () => {
  await assert.rejects(
    () =>
      analyze(photos, { key: "test", model: "test" }, async () => ({
        ok: true,
        json: async () => ({ status: "incomplete", output: [] }),
      })),
    /incomplète/,
  );
  await assert.rejects(
    () =>
      analyze(photos, { key: "test", model: "test" }, async () => ({
        ok: true,
        json: async () => ({
          status: "completed",
          output: [{ content: [{ type: "refusal" }] }],
        }),
      })),
    /exploitable/,
  );
});
