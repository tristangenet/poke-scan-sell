import { test, expect } from "@playwright/test";

async function addPhotos(page) {
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
  for (const side of ["front", "back"]) {
    await page.locator(`input[data-side="${side}"]`).setInputFiles({
      name: "carte.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
    await expect(
      page.getByAltText(
        side === "front" ? "Recto de la carte" : "Verso de la carte",
      ),
    ).toBeVisible();
  }
}
async function catalogue(page, ambiguous = false) {
  await page.route("https://api.tcgdex.net/**", (route) => {
    const id = route.request().url().split("/").pop();
    return route.fulfill({
      json:
        id === "cards"
          ? [
              { id: "base1-4", name: "Dracaufeu", localId: "4" },
              ...(ambiguous
                ? [{ id: "other-4", name: "Dracaufeu", localId: "4" }]
                : []),
            ]
          : {
              id,
              name: "Dracaufeu",
              localId: "4",
              set: { name: "Set de Base", cardCount: { official: 102 } },
              variants: { holo: true },
              pricing: { cardmarket: { trend: 50, updated: "2026-09-30" } },
            },
    });
  });
}
test("mode rapide : OCR, référence, prix, une validation et préférences réutilisées", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await catalogue(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Deux photos. Une annonce." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Préparer ma carte" }),
  ).toBeDisabled();
  await addPhotos(page);
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator('[data-field="name"]')).toHaveValue("Dracaufeu", {
    timeout: 45000,
  });
  await expect(page.locator('[data-field="number"]')).toHaveValue("4/102");
  await expect(page.locator('[data-field="set"]')).toHaveValue("Set de Base");
  await expect(page.locator('[data-field="variant"]')).toHaveValue("holo");
  await expect(page.locator('[data-field="price"]')).toHaveValue("");
  await page
    .getByRole("button", {
      name: "Utiliser cette tendance comme point de départ",
    })
    .click();
  await expect(page.locator('[data-field="price"]')).toHaveValue("50");
  await page
    .getByRole("button", { name: "Valider ma carte et créer l’annonce" })
    .click();
  await expect(page.locator("#toast")).toContainText("état");
  await expect(page.locator('[data-field="title"]')).toHaveCount(0);
  await page.locator('[data-field="condition"]').selectOption("EX");
  await page.locator('[data-field="vintedCondition"]').fill("Très bon état");
  await page.locator('[data-field="vintedCondition"]').blur();
  await page
    .locator('[data-field="packaging"]')
    .fill("Sleeve et protection rigide");
  await page.locator('[data-field="packaging"]').blur();
  await page
    .getByRole("button", { name: "Valider ma carte et créer l’annonce" })
    .click();
  await expect(page.locator('[data-field="title"]')).toHaveValue(/Dracaufeu/);
  await expect(
    page.getByRole("button", { name: "Télécharger le dossier ZIP" }),
  ).toBeEnabled();
  await page.locator('[data-field="price"]').fill("45");
  await page.locator('[data-field="price"]').blur();
  await page.getByRole("button", { name: "Relancer la préparation" }).focus();
  await expect(
    page.getByRole("button", { name: "Télécharger le dossier ZIP" }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "/tmp/poke-quick-mobile.png", fullPage: true });
  await page
    .getByRole("button", { name: "Vue d’ensemble", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Saisie manuelle / options avancées" })
    .click();
  await page.getByRole("button", { name: "5 Annonce" }).click();
  await expect(page.locator('[data-field="packaging"]')).toHaveValue(
    "Sleeve et protection rigide",
  );
  await expect(page.locator('[data-field="vintedCondition"]')).toHaveValue(
    "Très bon état",
  );
  expect(errors).toEqual([]);
});
test("une édition ambiguë n’est pas sélectionnée automatiquement", async ({
  page,
}) => {
  test.setTimeout(60000);
  await catalogue(page, true);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await addPhotos(page);
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator(".candidate")).toHaveCount(2, { timeout: 45000 });
  await expect(page.locator('[data-field="name"]')).toHaveValue("");
  await expect(page.locator('[data-field="price"]')).toHaveValue("");
});

test("mode IA configuré : identité et état proposés en une préparation", async ({
  page,
}) => {
  await catalogue(page);
  await page.route("**/api/vision", (route) =>
    route.fulfill({
      json: {
        name: "Dracaufeu",
        number: "4/102",
        set: "Set de Base",
        variant: "Holo illimité",
        condition: "EX",
        confidence: "medium",
        defects: ["Point blanc au dos"],
        warnings: [],
        photosSufficient: true,
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await addPhotos(page);
  await page.locator("#quick-ai").check();
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator('[data-field="condition"]')).toHaveValue("EX");
  await expect(page.locator('[data-field="variant"]')).toHaveValue(
    "Holo illimité",
  );
  await expect(page.locator('[data-field="defectNotes"]')).toHaveValue(
    "Point blanc au dos",
  );
  await expect(page.locator('[data-field="title"]')).toHaveCount(0);
});
