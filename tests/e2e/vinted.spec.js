import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
const script = await readFile(
  new URL("../../extensions/vinted/content.js", import.meta.url),
  "utf8",
);
import { data, draft, fixture, readyCard } from "./support/vinted-fixture.js";
async function controlForm(page, setup = () => {}) {
  await page.route("https://www.vinted.fr/items/new", (route) =>
    route.fulfill({ contentType: "text/html", body: fixture }),
  );
  await page.goto("https://www.vinted.fr/items/new");
  await page.evaluate(
    ({ draft, data }) => {
      window.reports = [];
      window.chrome = window.chrome || {};
      window.chrome.runtime = {
        sendMessage(message, reply) {
          if (message.type === "read-draft")
            return reply({ ok: true, id: "test-transfer", draft });
          if (message.type === "read-photo") return reply({ ok: true, data });
          if (message.type === "report") {
            window.reports.push(message);
            return reply({ ok: true });
          }
          reply({ ok: false });
        },
      };
    },
    { draft, data },
  );
  await page.evaluate(setup);
  await page.addScriptTag({ content: script });
}
test("Vinted : texte corrigé, prix décimal, état, catégorie et photos originaux transférés sans publier", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await controlForm(page);
  await expect(page.locator("#title")).toHaveValue(draft.title);
  await expect(page.locator("#description")).toHaveValue(draft.description);
  await expect(page.locator("#price")).toHaveValue("12,25");
  await expect(page.locator("#catalog_id")).toHaveValue("cards");
  await expect(page.locator("#status_id")).toHaveValue("very-good");
  await expect(page.locator("#photo-result")).toHaveText("2 photos reçues");
  await expect.poll(() => page.evaluate(() => window.reports.length)).toBe(1);
  const actual = await page.evaluate(() => ({
    photos: window.uploadedPhotos,
    state: window.formState,
    reports: window.reports,
    published: window.published,
  }));
  expect(actual.photos.map((p) => p.name)).toEqual([
    "1-front.png",
    "2-back.png",
  ]);
  expect(Buffer.from(actual.photos[0].bytes).toString("base64")).toBe(
    data.split(",")[1],
  );
  expect(actual.state.title).toBe(draft.title);
  expect(actual.reports[0].status).toBe("filled");
  expect(actual.reports[0].missing).toEqual(["parcel"]);
  expect(actual.published).toBe(0);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "/tmp/poke-vinted-control.png",
    fullPage: true,
  });
});
test("Vinted : un brouillon existant est conservé et aucun doublon de photos n’est ajouté", async ({
  page,
}) => {
  await controlForm(page, () => {
    document.querySelector("#title").value = "Mon autre article";
  });
  await expect.poll(() => page.evaluate(() => window.reports.length)).toBe(1);
  await expect(page.locator("#title")).toHaveValue("Mon autre article");
  await expect(page.locator("#description")).toHaveValue("");
  expect(await page.evaluate(() => window.uploadedPhotos || [])).toEqual([]);
  expect(await page.evaluate(() => window.reports[0].status)).toBe("blocked");
});
test("Vinted : repérage par libellés, prix numérique et attributs inconnus signalés", async ({
  page,
}) => {
  await controlForm(page, () => {
    for (const id of ["title", "description", "price"]) {
      document.querySelector(`[for="${id}"]`).htmlFor = `custom-${id}`;
      document.getElementById(id).id = `custom-${id}`;
    }
    document.querySelector("#custom-price").type = "number";
    document.querySelector("#custom-price").value = "0";
    document.querySelector("#catalog_id").remove();
    document.querySelector("#status_id").remove();
  });
  await expect(page.locator("#custom-title")).toHaveValue(draft.title);
  await expect(page.locator("#custom-price")).toHaveValue("12.25");
  await expect.poll(() => page.evaluate(() => window.reports.length)).toBe(1);
  expect(await page.evaluate(() => window.reports[0].missing)).toEqual([
    "category",
    "condition",
    "parcel",
  ]);
});

test("application : extension absente, installation guidée et ZIP associé uniquement à cette adresse", async ({
  page,
}) => {
  await readyCard(page);
  await page
    .getByRole("button", { name: "Remplir mon annonce sur Vinted" })
    .click();
  await expect(page.locator("#vinted-install")).toHaveAttribute("open", "");
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Télécharger l’extension Chrome / Edge" })
    .click();
  const download = await event;
  const chunks = [];
  for await (const chunk of await download.createReadStream())
    chunks.push(chunk);
  const files = await JSZip.loadAsync(Buffer.concat(chunks));
  const prefix = "poke-scan-sell-vinted/";
  const config = JSON.parse(
    await files.file(prefix + "config.json").async("text"),
  );
  const manifest = JSON.parse(
    await files.file(prefix + "manifest.json").async("text"),
  );
  expect(config.appOrigin).toBe("http://127.0.0.1:5173");
  expect(manifest.externally_connectable.matches).toEqual([
    "http://127.0.0.1/*",
  ]);
  expect(files.file(prefix + "background.js")).not.toBeNull();
  expect(files.file(prefix + "content.js")).not.toBeNull();
  expect(manifest.permissions).not.toContain("cookies");
});
test("application : un clic transmet texte et photos, puis une modification bloque le nouveau transfert", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.sent = [];
    window.chrome = window.chrome || {};
    window.chrome.runtime = {
      sendMessage(id, message, reply) {
        window.sent.push(message);
        if (message.type === "ping") return reply({ ok: true, protocol: 1 });
        if (message.type === "prepare")
          return reply({ ok: true, id: "transfer" });
        if (message.type === "status")
          return reply({ ok: true, status: "filled" });
        reply({ ok: true, id: "transfer" });
      },
    };
  });
  await readyCard(page);
  await page
    .getByRole("button", { name: "Remplir mon annonce sur Vinted" })
    .click();
  await expect(page.locator("#vinted-transfer-status")).toContainText(
    "Annonce envoyée",
  );
  const actual = await page.evaluate(() =>
    window.sent.filter((m) => m.type !== "ping"),
  );
  expect(actual.map((m) => m.type)).toEqual([
    "prepare",
    "photo",
    "photo",
    "commit",
  ]);
  expect(actual[0].draft.description).toBe(
    "Description personnalisée pour Vinted.",
  );
  expect(actual[0].draft.photos.map((p) => p.side)).toEqual(["front", "back"]);
  expect(actual[1].data).toBe(data);
  await page.locator('[data-field="price"]').fill("15");
  await page.locator('[data-field="price"]').blur();
  await expect(
    page.getByRole("button", { name: "Remplir mon annonce sur Vinted" }),
  ).toBeDisabled();
});
