import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  EXTENSION_ID,
  PHOTO_LIMIT,
  isAppSender,
  isVinted,
  isCreatePage,
  validateDraft,
  validatePhoto,
} from "../extensions/vinted/protocol.js";
const draft = {
  title: "Pokémon Dracaufeu 4/102 — FR",
  description: "Photos de cet exemplaire. État excellent.",
  price: 12.25,
  condition: "EX",
  photos: [
    { side: "front", type: "image/png" },
    { side: "back", type: "image/jpeg" },
  ],
};
test("transfert Vinted : identité de l’extension stable et origine de l’application exacte", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../extensions/vinted/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  const id = [
    ...createHash("sha256")
      .update(Buffer.from(manifest.key, "base64"))
      .digest()
      .subarray(0, 16),
  ]
    .map((b) => String.fromCharCode(97 + (b >> 4), 97 + (b & 15)))
    .join("");
  assert.equal(id, EXTENSION_ID);
  const origin = "https://my-app-3001.app.github.dev";
  assert.equal(isAppSender({ url: `${origin}/` }, origin), true);
  assert.equal(
    isAppSender({ url: "https://other-3001.app.github.dev/" }, origin),
    false,
  );
  assert.equal(
    isAppSender({ url: `${origin}/`, id: "another-extension" }, origin),
    false,
  );
  assert.equal(isAppSender({ url: `${origin}.evil.test/` }, origin), false);
  assert.equal(isVinted("https://www.vinted.fr/items/new"), true);
  assert.equal(isVinted("https://vinted.fr.evil.test/items/new"), false);
  assert.equal(isCreatePage("https://www.vinted.fr/member/register"), false);
});
test("transfert Vinted : annonce valide sans champs d’édition, d’état Vinted ou d’emballage", () => {
  assert.deepEqual(
    validateDraft({ ...draft, packaging: "ignoré", vintedCondition: "ignoré" }),
    draft,
  );
  for (const price of [0, -1, Infinity, "invalide"])
    assert.throws(() => validateDraft({ ...draft, price }));
  assert.throws(() => validateDraft({ ...draft, description: " " }));
  assert.throws(() =>
    validateDraft({
      ...draft,
      photos: [
        { side: "front", type: "image/png" },
        { side: "detail", type: "image/png" },
      ],
    }),
  );
});
test("transfert Vinted : photos originales bornées et aucun lien externe accepté comme photo", () => {
  const data = "data:image/png;base64,aGVsbG8=";
  assert.equal(validatePhoto(data, "image/png"), data);
  assert.throws(() => validatePhoto(data, "image/jpeg"));
  assert.throws(() =>
    validatePhoto("https://example.org/card.png", "image/png"),
  );
  assert.throws(() => validatePhoto("data:image/png;base64,%%%%", "image/png"));
  const tooBig = Buffer.alloc(PHOTO_LIMIT + 1).toString("base64");
  assert.throws(() =>
    validatePhoto(`data:image/png;base64,${tooBig}`, "image/png"),
  );
});
