import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import {
  fixture,
  readyCard,
  installConditionSelector,
} from "./support/vinted-fixture.js";
const content = await readFile(
  new URL("../../extensions/vinted/content.js", import.meta.url),
  "utf8",
);
const extensionId = "fdljjbnephkhdjoccpljmbohipiddlio";

// The real queue, validation and content script run in Chromium. Only Chrome's
// privileged tab/message APIs are represented by this fixture.
async function companion(
  page,
  context,
  requireLogin = false,
  conditionSelector,
) {
  const tabs = new Map();
  let nextTab = 1,
    login = requireLogin;
  await context.route("https://www.vinted.fr/**", (route) => {
    if (route.request().url().includes("/member/"))
      return route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: "<h1>Connexion Vinted — contrôle</h1>",
      });
    return route.fulfill({ contentType: "text/html", body: fixture });
  });
  await page.exposeFunction("transferCreateTab", async () => {
    const tab = await context.newPage();
    const id = nextTab++;
    tabs.set(id, tab);
    await tab.exposeFunction("sendInternal", async (message) =>
      page.evaluate(
        async ({ message, sender }) => {
          const background = await window.companionReady;
          return background.handleVinted(message, sender);
        },
        { message, sender: { id: extensionId, tab: { id }, url: tab.url() } },
      ),
    );
    await tab.addInitScript(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (options) {
        const root = attach.call(this, options);
        if (this.id === "poke-scan-sell-helper") window.helperRoot = root;
        return root;
      };
      window.chrome = window.chrome || {};
      window.chrome.runtime = {
        sendMessage(message, reply) {
          window
            .sendInternal(message)
            .then(reply, (e) => reply({ ok: false, error: e.message }));
        },
      };
    });
    return { id };
  });
  await page.exposeFunction("transferUpdateTab", async (id, options) => {
    const tab = tabs.get(id);
    if (options.url) {
      // Model the auth redirect explicitly: Playwright routing does not
      // intercept every subsequent URL of an HTTP redirect chain.
      const url = login
        ? "https://www.vinted.fr/member/register/select_type"
        : options.url;
      login = false;
      await tab.goto(url, { waitUntil: "domcontentloaded" });
      if (conditionSelector && url.includes("/items/new"))
        await tab.evaluate(installConditionSelector, conditionSelector);
      await tab.addScriptTag({ content });
    }
    return { id };
  });
  await page.exposeFunction("transferRemoveTab", async (id) => {
    await tabs.get(id)?.close();
    tabs.delete(id);
  });
  await page.addInitScript((id) => {
    window.chrome = window.chrome || {};
    window.chrome.runtime = {
      id,
      getURL: (name) => `http://127.0.0.1:5173/extensions/vinted/${name}`,
      getManifest: () => ({ version: "0.2.9" }),
      onMessageExternal: { addListener() {} },
      onMessage: { addListener() {} },
      sendMessage: (_id, message, reply) => {
        window.companionReady
          .then((background) =>
            background.handleApp(message, { url: location.href }),
          )
          .then(reply, (e) => reply({ ok: false, error: e.message }));
      },
    };
    window.chrome.tabs = {
      create: () => window.transferCreateTab(),
      update: (tabId, options) => window.transferUpdateTab(tabId, options),
      remove: (tabId) => window.transferRemoveTab(tabId),
      onRemoved: { addListener() {} },
    };
    window.chrome.alarms = { create() {}, onAlarm: { addListener() {} } };
    window.companionReady = import("/extensions/vinted/background.js");
  }, extensionId);
  return tabs;
}

test("photos HEIC : conversion réelle, OCR, ZIP puis deux JPEG reçus par le formulaire Vinted", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const tabs = await companion(page, context);
  await page.route("https://api.tcgdex.net/**", (route) =>
    route.fulfill({
      json: route.request().url().endsWith("/cards")
        ? [{ id: "base1-4", name: "Dracaufeu", localId: "4" }]
        : {
            id: "base1-4",
            name: "Dracaufeu",
            localId: "4",
            set: { name: "Set de Base", cardCount: { official: 102 } },
            variants: { holo: true },
          },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Scanner", exact: true })
    .first()
    .click();
  for (const [side, name, mimeType] of [
    ["front", "card-front.HEIC", "image/heic"],
    ["back", "card-back.heif", "image/heif"],
  ]) {
    const buffer = await readFile(
      new URL(`../fixtures/photos/${name}`, import.meta.url),
    );
    await page
      .locator(`input[data-side="${side}"]`)
      .setInputFiles({ name, mimeType, buffer });
    await expect(
      page.locator(`.photo-slot[data-side="${side}"] img`),
    ).toBeVisible();
  }
  const jpegData = await page
    .locator(".photo-slot img")
    .evaluateAll((images) => images.map((img) => img.src));
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator('[data-field="name"]')).toHaveValue("Dracaufeu", {
    timeout: 45000,
  });
  await expect(page.locator('[data-field="number"]')).toHaveValue("4/102");
  await page.locator('[data-field="condition"]').selectOption("EX");
  await page.locator('[data-field="price"]').fill("12.25");
  await page.locator('[data-field="price"]').blur();
  await page
    .getByRole("button", { name: "Valider ma carte et créer l’annonce" })
    .click();

  await page.locator(".manual-tools summary").click();
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Télécharger le dossier ZIP" })
    .click();
  const zip = await JSZip.loadAsync(await readFile(await (await event).path()));
  expect(Object.keys(zip.files).sort()).toEqual([
    "1-front.jpg",
    "2-back.jpg",
    "annonce.txt",
  ]);
  for (const [i, name] of ["1-front.jpg", "2-back.jpg"].entries())
    expect(await zip.file(name).async("nodebuffer")).toEqual(
      Buffer.from(jpegData[i].split(",")[1], "base64"),
    );

  await page
    .getByRole("button", { name: "Remplir mon annonce sur Vinted" })
    .click();
  await expect(page.locator("#vinted-transfer-status")).toContainText(
    "Annonce envoyée",
  );
  const tab = tabs.get(1);
  await expect(tab.locator("#photo-result")).toHaveText("2 photos reçues");
  await expect(tab.locator("#title")).toHaveValue(/Dracaufeu.*4\/102/);
  await expect(tab.locator("#price")).toHaveValue("12,25");
  await expect(tab.locator("#status_id")).toHaveValue("very-good");
  const received = await tab.evaluate(() => window.uploadedPhotos);
  expect(received.map(({ type }) => type)).toEqual([
    "image/jpeg",
    "image/jpeg",
  ]);
  for (const [i, photo] of received.entries())
    expect(Buffer.from(photo.bytes)).toEqual(
      Buffer.from(jpegData[i].split(",")[1], "base64"),
    );
  expect(await tab.evaluate(() => window.published)).toBe(0);
});

test("transfert complet : application → file IndexedDB → onglet Vinted → résultat et suppression des originaux temporaires", async ({
  page,
  context,
}) => {
  const tabs = await companion(page, context);
  await readyCard(page);
  await expect(page.locator("#vinted-connection-status")).toContainText(
    "connecté",
  );
  await page
    .getByRole("button", { name: "Remplir mon annonce sur Vinted" })
    .click();
  await expect(page.locator("#vinted-transfer-status")).toContainText(
    "Annonce envoyée",
  );
  const tab = tabs.get(1);
  await expect(tab.locator("#description")).toHaveValue(
    "Description personnalisée pour Vinted.",
  );
  await expect(tab.locator("#photo-result")).toHaveText("2 photos reçues");
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { listCards } = await import("/src/storage.js");
        const card = (await listCards())[0];
        return (
          await (
            await window.companionReady
          ).handleApp(
            { protocol: 1, type: "status", id: card.vintedTransferId },
            { url: location.href },
          )
        ).status;
      }),
    )
    .toBe("filled");
  const pending = await page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open("poke-scan-sell-vinted", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const records = await new Promise((resolve) => {
      const r = db.transaction("transfers").objectStore("transfers").getAll();
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return records.map((r) => ({
      status: r.status,
      draft: r.draft,
      fileCount: r.files.length,
    }));
  });
  expect(pending).toEqual([{ status: "filled", draft: null, fileCount: 0 }]);
  expect(await tab.evaluate(() => window.published)).toBe(0);
  await expect(page.locator(".saved")).toContainText("Prête");
});

test("transfert : garde le brouillon si l’état échoue puis termine la reprise sans doublon", async ({
  page,
  context,
}) => {
  const tabs = await companion(page, context, false, { rejected: true });
  await readyCard(page);
  await page
    .getByRole("button", { name: "Remplir mon annonce sur Vinted" })
    .click();
  await expect(page.locator("#vinted-transfer-status")).toContainText(
    "Annonce envoyée",
  );
  const tab = tabs.get(1);
  const queue = () =>
    page.evaluate(async () => {
      const db = await new Promise((resolve) => {
        const r = indexedDB.open("poke-scan-sell-vinted", 1);
        r.onsuccess = () => resolve(r.result);
      });
      const records = await new Promise((resolve) => {
        const r = db.transaction("transfers").objectStore("transfers").getAll();
        r.onsuccess = () => resolve(r.result);
      });
      db.close();
      return records.map((record) => ({
        status: record.status,
        hasDraft: !!record.draft,
        files: record.files.length,
        result: record.result,
      }));
    });
  await expect
    .poll(async () => (await queue())[0]?.status, { timeout: 8000 })
    .toBe("partial");
  const before = (await queue())[0];
  expect(before.hasDraft).toBe(true);
  expect(before.files).toBe(2);
  expect(before.result.photosSubmitted).toBe(true);
  expect(before.result.missing).toContain("condition");
  await tab.evaluate(() => {
    window.uploadEvents = 0;
    document
      .getElementById("images")
      .addEventListener("change", () => window.uploadEvents++);
    window.rejectCondition = false;
    [...window.helperRoot.querySelectorAll("button")]
      .find((button) => button.textContent === "Reprendre le remplissage")
      .click();
  });
  await expect.poll(async () => (await queue())[0]?.status).toBe("filled");
  const after = (await queue())[0];
  expect(after.hasDraft).toBe(false);
  expect(after.files).toBe(0);
  expect(after.result.fields).toContain("condition");
  expect(await tab.evaluate(() => window.conditionCommitted)).toBe("very-good");
  expect(await tab.evaluate(() => window.uploadEvents)).toBe(0);
  await expect(tab.locator("#photo-result")).toHaveText("2 photos reçues");
  expect(await tab.evaluate(() => window.published)).toBe(0);
});

test("transfert : connexion en attente, reprise sur le même onglet et rejet d’une autre application", async ({
  page,
  context,
}) => {
  const tabs = await companion(page, context, true);
  await readyCard(page);
  const rejected = await page.evaluate(async () => {
    try {
      await (
        await window.companionReady
      ).handleApp(
        { type: "ping", protocol: 1 },
        { url: "https://another-app-3001.app.github.dev/" },
      );
    } catch (e) {
      return e.message;
    }
  });
  expect(rejected).toContain("non associée");
  await page
    .getByRole("button", { name: "Remplir mon annonce sur Vinted" })
    .click();
  await expect(page.locator("#vinted-transfer-status")).toContainText(
    "Annonce envoyée",
  );
  const tab = tabs.get(1);
  await expect(
    tab.getByRole("heading", { name: "Connexion Vinted — contrôle" }),
  ).toBeVisible();
  await expect(tab.locator("#poke-scan-sell-helper")).toHaveCount(1);
  await tab.goto("https://www.vinted.fr/items/new");
  await tab.addScriptTag({ content });
  await expect(tab.locator("#title")).toHaveValue(/Dracaufeu/);
  await expect(tab.locator("#photo-result")).toHaveText("2 photos reçues");
  expect(tabs.size).toBe(1);
});
