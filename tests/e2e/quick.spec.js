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
  await expect(page.locator("#job-status")).toContainText("ne distingue pas", {
    timeout: 45000,
  });
  await expect(page.locator(".candidate")).toHaveCount(0);
  await expect(page.locator('[data-field="name"]')).toHaveValue("Dracaufeu");
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

test("plus de 24 références : l’extension cible la bonne carte sans charger les autres fiches", async ({
  page,
}) => {
  test.setTimeout(60000);
  const requests = [];
  const briefs = Array.from({ length: 30 }, (_, i) => ({
    id: `series${i}-4`,
    name: "Dracaufeu",
    localId: "4",
  }));
  const sets = Array.from({ length: 30 }, (_, i) => ({
    id: `series${i}`,
    name: `Extension ${i}`,
    cardCount: { official: i === 28 ? 102 : 200 + i },
  }));
  let selectedCalls = 0;
  await page.route("https://api.tcgdex.net/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    requests.push(path);
    if (path.endsWith("/sets")) return route.fulfill({ json: sets });
    if (path.endsWith("/cards")) return route.fulfill({ json: briefs });
    if (path.endsWith("/cards/series28-4")) {
      selectedCalls++;
      if (selectedCalls === 1)
        return route.fulfill({ status: 503, json: { error: "Temporaire" } });
      return route.fulfill({
        json: { ...briefs[28], set: sets[28], variants: { holo: true } },
      });
    }
    return route.fulfill({
      status: 500,
      json: { error: "Fiche hors de la bonne extension" },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await addPhotos(page);
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator('[data-field="set"]')).toHaveValue("Extension 28", {
    timeout: 45000,
  });
  await expect(page.locator('[data-field="name"]')).toHaveValue("Dracaufeu");
  await expect(page.locator('[data-field="number"]')).toHaveValue("4/102");
  expect(selectedCalls).toBe(2);
  expect(requests.filter((path) => path.includes("/cards/"))).toEqual([
    "/v2/fr/cards/series28-4",
    "/v2/fr/cards/series28-4",
  ]);
});

test("fiche détaillée indisponible : identité conservée, prix et variante laissés vides", async ({
  page,
}) => {
  test.setTimeout(60000);
  const set = {
    id: "base1",
    name: "Set de Base",
    cardCount: { official: 102 },
  };
  await page.route("https://api.tcgdex.net/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/sets")) return route.fulfill({ json: [set] });
    if (path.endsWith("/cards"))
      return route.fulfill({
        json: [{ id: "base1-4", name: "Dracaufeu", localId: "4" }],
      });
    return route.fulfill({ status: 404, json: { error: "Fiche absente" } });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await addPhotos(page);
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator('[data-field="set"]')).toHaveValue("Set de Base", {
    timeout: 45000,
  });
  await expect(page.locator('[data-field="name"]')).toHaveValue("Dracaufeu");
  await expect(page.locator('[data-field="number"]')).toHaveValue("4/102");
  await expect(page.locator('[data-field="price"]')).toHaveValue("");
  await expect(page.locator('[data-field="variant"]')).toHaveValue("");
  await expect(page.locator("#job-status")).toContainText(
    "variantes et le prix",
  );
});
