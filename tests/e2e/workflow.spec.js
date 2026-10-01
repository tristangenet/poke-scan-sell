import { test, expect } from "@playwright/test";
import JSZip from "jszip";
test("parcours complet : photos, identité, prix, annonce, sauvegarde et restauration", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  const image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 650;
    c.height = 900;
    const x = c.getContext("2d");
    x.fillStyle = "#e3e9ca";
    x.fillRect(0, 0, 650, 900);
    x.fillStyle = "#163a2b";
    x.font = "40px sans-serif";
    x.fillText("CARTE DE TEST", 50, 120);
    return c.toDataURL("image/png").split(",")[1];
  });
  const file = {
    name: "test.png",
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  };
  await page.locator('input[data-side="front"]').setInputFiles(file);
  await expect(
    page.locator(".photo-slot").getByAltText("Recto de la carte"),
  ).toBeVisible();
  await page.locator('input[data-side="back"]').setInputFiles(file);
  await expect(page.getByAltText("Verso de la carte")).toBeVisible();
  await page
    .getByRole("button", { name: "Saisie manuelle / options avancées" })
    .click();
  await page.getByRole("button", { name: "2 Identification" }).click();
  for (const [field, value] of [
    ["name", "Dracaufeu"],
    ["number", "4/102"],
    ["set", "Set de Base"],
    ["variant", "Holo illimité"],
  ]) {
    await page.locator(`[data-field="${field}"]`).fill(value);
    await page.locator(`[data-field="${field}"]`).blur();
  }
  await page.locator('[data-field="identityConfirmed"]').check();
  await expect(page.locator('[data-field="identityConfirmed"]')).toBeChecked();
  await page.getByRole("button", { name: "3 État" }).click();
  await page.locator('[data-field="condition"]').selectOption("EX");
  await page.locator('[data-field="conditionConfirmed"]').check();
  await expect(page.locator('[data-field="conditionConfirmed"]')).toBeChecked();
  await page.getByRole("button", { name: "4 Estimation" }).click();
  for (const amount of [10, 12, 14]) {
    await page.locator('[name="amount"]').fill(String(amount));
    await page
      .locator('[name="url"]')
      .fill(`https://www.vinted.fr/items/${amount}`);
    await page.locator('[name="note"]').fill(`Prix demandé observé ${amount}`);
    await page.locator('[name="match"]').check();
    await page.getByRole("button", { name: "Ajouter ce comparable" }).click();
    await expect(page.locator(".observations article")).toHaveCount(
      amount === 10 ? 1 : amount === 12 ? 2 : 3,
    );
  }
  await expect(page.locator(".estimate-box")).toContainText("11,00");
  await page
    .getByRole("button", { name: /Utiliser le prix conseillé/ })
    .click();
  await expect(page.locator('[data-field="price"]')).toHaveValue("12");
  await page.getByRole("button", { name: "5 Annonce" }).click();
  await page.locator('[data-field="vintedCondition"]').fill("Très bon état");
  await page.locator('[data-field="vintedCondition"]').blur();
  await page
    .locator('[data-field="packaging"]')
    .fill("Sleeve et protection rigide");
  await page.locator('[data-field="packaging"]').blur();
  await page
    .getByRole("button", { name: "Générer l’annonce", exact: true })
    .click();
  await expect(page.locator('[data-field="title"]')).toHaveValue(/Dracaufeu/);
  await expect(page.locator('[data-field="description"]')).toHaveValue(
    /Sleeve et protection rigide/,
  );
  await page
    .locator('[data-field="description"]')
    .fill("Description personnalisée conservée.");
  await page.locator('[data-field="description"]').blur();
  const zipEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Télécharger le dossier ZIP" })
    .click();
  const zip = await zipEvent;
  const stream = await zip.createReadStream();
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  const files = await JSZip.loadAsync(Buffer.concat(chunks));
  expect(Object.keys(files.files)).toHaveLength(3);
  expect(await files.file("annonce.txt").async("text")).toContain(
    "Description personnalisée conservée.",
  );
  await page
    .locator('[data-field="listingUrl"]')
    .fill("https://www.vinted.fr/items/123-test");
  await page.locator('[data-field="listingUrl"]').blur();
  await page
    .getByRole("button", { name: "Confirmer la publication manuellement" })
    .click();
  await expect(page.locator(".saved")).toContainText("Publiée");
  const exportEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sauvegarder", exact: true }).click();
  const backup = await exportEvent;
  const backupPath = await backup.path();
  await page.reload();
  await page
    .getByRole("button", { name: "Ma collection", exact: true })
    .click();
  await expect(page.locator(".collection-card")).toHaveCount(1);
  await page.locator(".collection-card").click();
  await page
    .getByRole("button", { name: "Saisie manuelle / options avancées" })
    .click();
  await page.getByRole("button", { name: "5 Annonce" }).click();
  await expect(page.locator('[data-field="description"]')).toHaveValue(
    "Description personnalisée conservée.",
  );
  await page
    .getByRole("button", { name: "Données & services", exact: true })
    .click();
  await page.locator("#restore").setInputFiles(backupPath);
  await expect(page.locator("#toast")).toContainText("1 carte(s) restaurée(s)");
  await page
    .getByRole("button", { name: "Ma collection", exact: true })
    .click();
  await expect(page.locator(".collection-card")).toHaveCount(2);
  expect(errors).toEqual([]);
});
test("mobile, absence de débordement, blocage sans verso et absence de prix fictif", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("heading", { name: "Vos cartes. Leur prochain chapitre." })
    .waitFor();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Saisie manuelle / options avancées" })
    .click();
  await page.getByRole("button", { name: "3 État" }).click();
  await expect(
    page.locator('[data-field="conditionConfirmed"]'),
  ).toBeDisabled();
  await page.getByRole("button", { name: "4 Estimation" }).click();
  await expect(page.locator(".estimate-box")).toContainText(
    "Données insuffisantes",
  );
  await page.getByRole("button", { name: "5 Annonce" }).click();
  await expect(
    page.getByRole("button", { name: "Générer l’annonce", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("catalogue : sélection explicite et données externes échappées", async ({
  page,
}) => {
  await page.route("https://api.tcgdex.net/**", (route) =>
    route.fulfill({
      json: route.request().url().includes("/cards/test-4")
        ? {
            id: "test-4",
            name: "<img src=x onerror=alert(1)>",
            localId: "4",
            set: { name: "Test", cardCount: { official: 102 } },
            variants: { holo: true },
            pricing: { cardmarket: { trend: 50, updated: "2026-09-30" } },
          }
        : [{ id: "test-4", name: "Dracaufeu", localId: "4" }],
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Saisie manuelle / options avancées" })
    .click();
  await page.getByRole("button", { name: "2 Identification" }).click();
  await page.locator('[data-field="name"]').fill("Dracaufeu");
  await page.locator('[data-field="name"]').blur();
  await page
    .getByRole("button", { name: "Rechercher dans le catalogue" })
    .click();
  await page.getByRole("button", { name: /Choisir cette référence/ }).click();
  await expect(page.locator('[data-field="name"]')).toHaveValue(
    "<img src=x onerror=alert(1)>",
  );
  await expect(
    page.locator('[data-field="identityConfirmed"]'),
  ).not.toBeChecked();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
});

test("OCR réel avec moteur local : nom et numéro lus sur une image synthétique", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.route("https://api.tcgdex.net/**", (route) =>
    route.fulfill({
      json: [{ id: "base1-4", name: "Dracaufeu", localId: "4" }],
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  const image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 1100;
    const x = c.getContext("2d");
    x.fillStyle = "white";
    x.fillRect(0, 0, 800, 1100);
    x.fillStyle = "black";
    x.font = "bold 60px Arial";
    x.fillText("Dracaufeu", 70, 100);
    x.font = "40px Arial";
    x.fillText("4/102", 70, 1000);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[data-side="front"]').setInputFiles({
    name: "ocr-test.png",
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  });
  await expect(page.locator(".photo-slot img")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Saisie manuelle / options avancées" })
    .click();
  await page.getByRole("button", { name: "2 Identification" }).click();
  await page.getByRole("button", { name: "Lire la photo avec l’OCR" }).click();
  await expect(page.locator('[data-field="number"]')).toHaveValue("4/102", {
    timeout: 45000,
  });
  await expect(page.locator(".candidates")).toContainText("Dracaufeu");
  await expect(
    page.locator('[data-field="identityConfirmed"]'),
  ).not.toBeChecked();
});
